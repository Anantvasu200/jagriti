CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS incidents (
    id          SERIAL PRIMARY KEY,
    crime_type  VARCHAR(100) NOT NULL,
    description TEXT,
    location    VARCHAR(255),
    city        VARCHAR(100),
    state       VARCHAR(100),
    source      VARCHAR(50),
    source_url  TEXT,
    reported_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    geom        GEOMETRY(Point, 4326)
);

CREATE INDEX IF NOT EXISTS incidents_geom_idx ON incidents USING GIST (geom);

CREATE TABLE IF NOT EXISTS community_reports (
    id          SERIAL PRIMARY KEY,
    crime_type  VARCHAR(100) NOT NULL,
    description TEXT,
    lat         DECIMAL(10,7) NOT NULL,
    lon         DECIMAL(10,7) NOT NULL,
    verified    BOOLEAN DEFAULT FALSE,
    report_count INT DEFAULT 1,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    geom        GEOMETRY(Point, 4326)
);

CREATE INDEX IF NOT EXISTS community_reports_geom_idx ON community_reports USING GIST (geom);
