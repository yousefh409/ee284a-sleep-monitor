export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS telemetry (
  id              BIGSERIAL PRIMARY KEY,
  device          TEXT NOT NULL,
  ts              TIMESTAMPTZ NOT NULL,
  presence        INT,
  in_bed          INT,
  sleep_state     INT,
  breathing       INT,
  heart_rate      INT,
  turnover        INT,
  body_move_large INT,
  body_move_small INT,
  apnea_events    INT,
  temp_c          REAL,
  humidity        REAL,
  pressure_hpa    REAL,
  gas_ohm         INT,
  db_spl          REAL,
  light_raw       INT,
  hum_presence    INT,
  hum_motion      INT,
  hum_range       INT,
  hum_dist_cm     INT,
  hr_instant      INT,
  breath_state    INT,
  breath_value    INT,
  wake_dur        INT,
  light_sleep_dur INT,
  deep_sleep_dur  INT,
  sleep_quality   INT,
  disturbances    INT,
  quality_rating  INT,
  abnormal_struggle INT,
  unattended_state INT,
  unattended_time INT,
  sleep_score     INT,
  sleep_time_min  INT,
  shallow_pct     INT,
  deep_pct        INT,
  time_out_of_bed INT,
  exit_count      INT,
  turnover_total  INT
);

ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS gas_ohm INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS hum_presence INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS hum_motion INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS hum_range INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS hum_dist_cm INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS hr_instant INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS breath_state INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS breath_value INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS wake_dur INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS light_sleep_dur INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS deep_sleep_dur INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS sleep_quality INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS disturbances INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS quality_rating INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS abnormal_struggle INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS unattended_state INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS unattended_time INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS sleep_score INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS sleep_time_min INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS shallow_pct INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS deep_pct INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS time_out_of_bed INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS exit_count INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS turnover_total INT;

CREATE INDEX IF NOT EXISTS telemetry_device_ts_idx ON telemetry (device, ts DESC);

CREATE TABLE IF NOT EXISTS nights (
  id              BIGSERIAL PRIMARY KEY,
  device          TEXT NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ NOT NULL,
  duration_sec    INT NOT NULL,
  sleep_score     INT
);

CREATE INDEX IF NOT EXISTS nights_device_started_idx ON nights (device, started_at DESC);

CREATE TABLE IF NOT EXISTS reports (
  id              BIGSERIAL PRIMARY KEY,
  night_id        BIGINT NOT NULL REFERENCES nights(id) ON DELETE CASCADE,
  headline        TEXT NOT NULL,
  sleep_score     INT,
  stage_pct       JSONB,
  vitals          JSONB,
  wake_events     JSONB,
  recommendations JSONB,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reports ADD COLUMN IF NOT EXISTS sleep_health TEXT;

CREATE INDEX IF NOT EXISTS reports_night_idx ON reports (night_id);
`;
