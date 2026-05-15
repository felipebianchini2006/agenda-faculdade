require "random/secure"

module AgendaFaculdade
  module Infrastructure
    module IdGenerator
      def self.generate(prefix : String) : String
        "#{prefix}_#{Random::Secure.hex(16)}"
      end
    end
  end
end

