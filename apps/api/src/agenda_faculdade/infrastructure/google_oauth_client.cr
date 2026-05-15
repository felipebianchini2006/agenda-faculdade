require "http/client"
require "json"
require "uri"

module AgendaFaculdade
  module Infrastructure
    class GoogleIdentity
      getter sub, email, name, avatar_url

      def initialize(@sub : String, @email : String, @name : String, @avatar_url : String?)
      end
    end

    class OAuthToken
      getter access_token, refresh_token, expires_in, scope

      def initialize(@access_token : String, @refresh_token : String?, @expires_in : Int32?, @scope : String)
      end
    end

    class GoogleOAuthClient
      def initialize(@config : Config)
      end

      def auth_url(state : String, redirect_path : String, scopes : Array(String), access_type : String? = nil, prompt : String? = nil) : String
        params = URI::Params.encode({
          "client_id" => @config.google_client_id,
          "redirect_uri" => "#{@config.app_base_url}#{redirect_path}",
          "response_type" => "code",
          "scope" => scopes.join(" "),
          "state" => state,
          "access_type" => access_type,
          "prompt" => prompt,
        }.compact)
        "#{@config.google_oauth_authorize_url}?#{params}"
      end

      def exchange_code(code : String, redirect_path : String) : OAuthToken
        body = URI::Params.encode({
          "client_id" => @config.google_client_id,
          "client_secret" => @config.google_client_secret,
          "code" => code,
          "grant_type" => "authorization_code",
          "redirect_uri" => "#{@config.app_base_url}#{redirect_path}",
        })
        token_from_response(HTTP::Client.post(@config.google_oauth_token_url, form_headers, body))
      end

      def refresh_access_token(refresh_token : String) : OAuthToken
        body = URI::Params.encode({
          "client_id" => @config.google_client_id,
          "client_secret" => @config.google_client_secret,
          "refresh_token" => refresh_token,
          "grant_type" => "refresh_token",
        })
        token_from_response(HTTP::Client.post(@config.google_oauth_token_url, form_headers, body))
      end

      def fetch_identity(access_token : String) : GoogleIdentity
        headers = HTTP::Headers{"Authorization" => "Bearer #{access_token}"}
        response = HTTP::Client.get(@config.google_userinfo_url, headers)
        raise "Google userinfo failed: #{response.status_code}" unless response.success?

        payload = JSON.parse(response.body)
        GoogleIdentity.new(
          sub: payload["sub"].as_s,
          email: payload["email"].as_s,
          name: payload["name"]?.try(&.as_s) || payload["email"].as_s,
          avatar_url: payload["picture"]?.try(&.as_s)
        )
      end

      private def token_from_response(response : HTTP::Client::Response) : OAuthToken
        raise "Google token exchange failed: #{response.status_code}" unless response.success?

        payload = JSON.parse(response.body)
        OAuthToken.new(
          access_token: payload["access_token"].as_s,
          refresh_token: payload["refresh_token"]?.try(&.as_s),
          expires_in: payload["expires_in"]?.try(&.as_i),
          scope: payload["scope"]?.try(&.as_s) || ""
        )
      end

      private def form_headers : HTTP::Headers
        HTTP::Headers{"Content-Type" => "application/x-www-form-urlencoded"}
      end
    end
  end
end

