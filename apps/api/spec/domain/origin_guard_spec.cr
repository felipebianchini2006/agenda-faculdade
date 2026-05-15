require "../spec_helper"

describe AgendaFaculdade::Interfaces::Http::OriginGuard do
  allowed = "https://calendario.felipeb.tech"
  guard = AgendaFaculdade::Interfaces::Http::OriginGuard

  it "allows safe requests from any origin" do
    guard.allowed?("GET", "https://evil.example", allowed).should be_true
    guard.allowed?("OPTIONS", "https://evil.example", allowed).should be_true
  end

  it "allows internal mutating requests without an origin header" do
    guard.allowed?("POST", nil, allowed).should be_true
  end

  it "allows mutating requests from the configured frontend origin" do
    guard.allowed?("PATCH", "https://calendario.felipeb.tech", allowed).should be_true
  end

  it "rejects mutating requests from a different origin" do
    guard.allowed?("DELETE", "https://evil.example", allowed).should be_false
  end
end
