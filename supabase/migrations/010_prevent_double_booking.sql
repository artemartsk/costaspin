-- Add trigger to prevent double booking of practitioners and rooms

CREATE OR REPLACE FUNCTION check_appointment_overlap()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the room is already booked
    IF EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.id != NEW.id
          AND a.room_id = NEW.room_id
          AND a.start_time < NEW.end_time
          AND a.end_time > NEW.start_time
    ) THEN
        RAISE EXCEPTION 'Room is already booked for this time slot.';
    END IF;

    -- Check if the practitioner is already booked
    IF EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.id != NEW.id
          AND a.practitioner_id = NEW.practitioner_id
          AND a.start_time < NEW.end_time
          AND a.end_time > NEW.start_time
    ) THEN
        RAISE EXCEPTION 'Practitioner is already booked for this time slot.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_overlap ON appointments;

CREATE TRIGGER prevent_overlap
BEFORE INSERT OR UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION check_appointment_overlap();
