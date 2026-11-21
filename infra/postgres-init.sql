-- Runs once when the Postgres volume is first created: a separate database for the test suite.
CREATE DATABASE certiflow_test OWNER certiflow;
