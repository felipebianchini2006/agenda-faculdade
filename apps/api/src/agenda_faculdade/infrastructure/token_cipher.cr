require "base64"
require "digest/sha256"
require "openssl/cipher"
require "random/secure"

module AgendaFaculdade
  module Infrastructure
    class TokenCipher
      def initialize(secret : String)
        @key = Digest::SHA256.digest(secret)
      end

      def encrypt(value : String) : String
        cipher = OpenSSL::Cipher.new("aes-256-cbc")
        cipher.encrypt
        iv = Random::Secure.random_bytes(16)
        cipher.key = @key
        cipher.iv = iv
        encrypted = cipher.update(value.to_slice) + cipher.final
        Base64.strict_encode(iv + encrypted)
      end

      def decrypt(value : String) : String
        raw = Base64.decode(value)
        iv = raw[0, 16]
        encrypted = raw[16, raw.size - 16]
        cipher = OpenSSL::Cipher.new("aes-256-cbc")
        cipher.decrypt
        cipher.key = @key
        cipher.iv = iv
        String.new(cipher.update(encrypted) + cipher.final)
      end
    end
  end
end

