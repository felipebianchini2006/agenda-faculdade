require "../spec_helper"

describe AgendaFaculdade::Domain::User do
  it "bootstraps Felipe as admin" do
    user = AgendaFaculdade::Domain::User.bootstrap(
      id: "user-1",
      email: "felipebianchini02@gmail.com",
      name: "Felipe",
      google_sub: "google-1",
      admin_email: "felipebianchini02@gmail.com"
    )

    user.admin?.should be_true
    user.active?.should be_true
  end

  it "bootstraps other users as members" do
    user = AgendaFaculdade::Domain::User.bootstrap(
      id: "user-2",
      email: "colega@example.com",
      name: "Colega",
      google_sub: "google-2",
      admin_email: "felipebianchini02@gmail.com"
    )

    user.member?.should be_true
    user.active?.should be_true
  end

  it "blocks disabled users" do
    user = AgendaFaculdade::Domain::User.new(
      id: "user-3",
      email: "colega@example.com",
      name: "Colega",
      google_sub: "google-3",
      role: AgendaFaculdade::Domain::UserRole::Member,
      status: AgendaFaculdade::Domain::UserStatus::Disabled
    )

    user.can_access?.should be_false
  end
end

