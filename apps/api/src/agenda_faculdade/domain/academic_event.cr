module AgendaFaculdade
  module Domain
    enum AcademicEventKind
      Exam
      Assignment

      def self.from_db(value : String) : AcademicEventKind
        case value
        when "exam"
          Exam
        when "assignment"
          Assignment
        else
          raise ValidationError.new("invalid event kind")
        end
      end

      def to_db : String
        exam? ? "exam" : "assignment"
      end
    end

    enum AcademicEventStatus
      Active
      Deleted

      def self.from_db(value : String) : AcademicEventStatus
        case value
        when "active"
          Active
        when "deleted"
          Deleted
        else
          raise ValidationError.new("invalid event status")
        end
      end

      def to_db : String
        active? ? "active" : "deleted"
      end
    end

    class AcademicEvent
      getter id, title, kind, subject, starts_at, ends_at, description, location, status, created_by

      def initialize(
        @id : String,
        @title : String,
        @kind : AcademicEventKind,
        @subject : String,
        @starts_at : Time,
        @ends_at : Time,
        @description : String?,
        @location : String?,
        @status : AcademicEventStatus,
        @created_by : String
      )
      end

      def self.create(
        id : String,
        title : String,
        kind : AcademicEventKind,
        subject : String,
        starts_at : Time,
        ends_at : Time,
        description : String?,
        location : String?,
        created_by : String
      ) : AcademicEvent
        normalized_title = title.strip
        normalized_subject = subject.strip

        raise ValidationError.new("title is required") if normalized_title.empty?
        raise ValidationError.new("subject is required") if normalized_subject.empty?
        raise ValidationError.new("ends_at must be after starts_at") unless ends_at > starts_at

        new(
          id: id,
          title: normalized_title,
          kind: kind,
          subject: normalized_subject,
          starts_at: starts_at,
          ends_at: ends_at,
          description: description.try(&.strip).presence,
          location: location.try(&.strip).presence,
          status: AcademicEventStatus::Active,
          created_by: created_by
        )
      end

      def exam? : Bool
        kind.exam?
      end

      def assignment? : Bool
        kind.assignment?
      end

      def active? : Bool
        status.active?
      end

      def deleted? : Bool
        status.deleted?
      end

      def soft_delete : AcademicEvent
        AcademicEvent.new(id, title, kind, subject, starts_at, ends_at, description, location, AcademicEventStatus::Deleted, created_by)
      end
    end
  end
end

