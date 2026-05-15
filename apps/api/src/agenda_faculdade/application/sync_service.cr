module AgendaFaculdade
  module Application
    class SyncService
      def initialize(
        @store : Infrastructure::PostgresStore,
        @calendar : Infrastructure::CalendarClient,
        @payload_builder : CalendarPayloadBuilder
      )
      end

      def enqueue_event_changed(event_id : String, action : String) : Nil
        @store.enqueue_sync_for_event(event_id, action)
      end

      def enqueue_all_for_user(user_id : String) : Nil
        @store.enqueue_all_events_for_user(user_id)
      end

      def process_due(limit : Int32 = 25) : Int32
        jobs = @store.pending_sync_jobs(limit)
        jobs.each { |job| process(job) }
        jobs.size
      end

      private def process(job : Infrastructure::SyncJob) : Nil
        @store.mark_job_processing(job.id)
        event = @store.find_event(job.academic_event_id)
        connection = @store.find_calendar_connection(job.user_id)

        unless event && connection
          @store.mark_job_done(job.id)
          return
        end

        sync_record = @store.find_sync_record(job.user_id, job.academic_event_id)
        if job.action == "delete" || event.deleted?
          google_event_id = sync_record.try(&.google_event_id)
          @calendar.delete(job.user_id, connection, event, google_event_id) if google_event_id
          @store.mark_sync_success(job.user_id, job.academic_event_id, google_event_id, "deleted")
          @store.mark_job_done(job.id)
          return
        end

        payload = JSON.parse(@payload_builder.build(event).to_json)
        google_event_id = sync_record.try(&.google_event_id)
        next_google_event_id =
          if google_event_id
            @calendar.update(job.user_id, connection, event, google_event_id, payload)
          else
            @calendar.insert(job.user_id, connection, event, payload)
          end

        @store.mark_sync_success(job.user_id, job.academic_event_id, next_google_event_id, "synced")
        @store.mark_job_done(job.id)
      rescue ex
        @store.mark_sync_failure(job.user_id, job.academic_event_id, ex.message || ex.class.name)
        @store.mark_job_failed(job.id, ex.message || ex.class.name)
      end
    end
  end
end

