require "../spec_helper"

describe AgendaFaculdade::Infrastructure::TokenCipher do
  cipher = AgendaFaculdade::Infrastructure::TokenCipher.new("test-secret-key")

  it "decrypts values encrypted by the same key" do
    encrypted = cipher.encrypt("refresh-token-value")

    encrypted.should_not eq("refresh-token-value")
    cipher.decrypt(encrypted).should eq("refresh-token-value")
  end

  it "uses a fresh initialization vector for each encryption" do
    first = cipher.encrypt("same-token")
    second = cipher.encrypt("same-token")

    first.should_not eq(second)
    cipher.decrypt(first).should eq("same-token")
    cipher.decrypt(second).should eq("same-token")
  end

  it "rejects corrupted ciphertext" do
    encrypted = cipher.encrypt("refresh-token-value")
    corrupted = encrypted[0, encrypted.size - 2] + "xx"

    expect_raises(Exception) do
      cipher.decrypt(corrupted)
    end
  end
end
