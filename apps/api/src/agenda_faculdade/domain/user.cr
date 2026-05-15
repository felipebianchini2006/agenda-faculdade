module AgendaFaculdade
  module Domain
    enum UserRole
      Admin
      Member

      def self.from_db(value : String) : UserRole
        case value
        when "admin"
          Admin
        when "member"
          Member
        else
          raise ValidationError.new("invalid role")
        end
      end

      def to_db : String
        admin? ? "admin" : "member"
      end
    end

    enum UserStatus
      Active
      Disabled

      def self.from_db(value : String) : UserStatus
        case value
        when "active"
          Active
        when "disabled"
          Disabled
        else
          raise ValidationError.new("invalid status")
        end
      end

      def to_db : String
        active? ? "active" : "disabled"
      end
    end

    class User
      getter id, email, name, google_sub, role, status, avatar_url

      def initialize(
        @id : String,
        @email : String,
        @name : String,
        @google_sub : String,
        @role : UserRole,
        @status : UserStatus,
        @avatar_url : String? = nil
      )
      end

      def self.bootstrap(id : String, email : String, name : String, google_sub : String, admin_email : String, avatar_url : String? = nil) : User
        normalized_email = email.downcase.strip
        role = normalized_email == admin_email.downcase.strip ? UserRole::Admin : UserRole::Member

        new(
          id: id,
          email: normalized_email,
          name: name.strip.empty? ? normalized_email : name.strip,
          google_sub: google_sub,
          role: role,
          status: UserStatus::Active,
          avatar_url: avatar_url
        )
      end

      def admin? : Bool
        role.admin?
      end

      def member? : Bool
        role.member?
      end

      def active? : Bool
        status.active?
      end

      def can_access? : Bool
        active?
      end

      def with_role(next_role : UserRole) : User
        User.new(id, email, name, google_sub, next_role, status, avatar_url)
      end

      def with_status(next_status : UserStatus) : User
        User.new(id, email, name, google_sub, role, next_status, avatar_url)
      end
    end
  end
end

