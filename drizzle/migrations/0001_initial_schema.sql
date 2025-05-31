-- Migration: Initial schema for DevSec Scanner
-- Created at: 2024-01-01

-- Create sessions table (required for authentication)
CREATE TABLE IF NOT EXISTS "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);

-- Create index for session expiration
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar UNIQUE,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar NOT NULL DEFAULT 'user',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Create tools table
CREATE TABLE IF NOT EXISTS "tools" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"type" varchar NOT NULL,
	"description" text,
	"install_command" text,
	"run_command" text,
	"installed" boolean DEFAULT false,
	"owner_id" varchar,
	"created_at" timestamp DEFAULT now()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);

-- Create scans table
CREATE TABLE IF NOT EXISTS "scans" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"tool_id" integer NOT NULL,
	"status" varchar NOT NULL DEFAULT 'pending',
	"result" jsonb,
	"target_url" varchar,
	"options" text,
	"started_at" timestamp,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE "tools" ADD CONSTRAINT "tools_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "scans" ADD CONSTRAINT "scans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "scans" ADD CONSTRAINT "scans_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE cascade ON UPDATE no action;

-- Insert default security tools
INSERT INTO "tools" ("name", "type", "description", "install_command", "run_command", "installed") VALUES
('SonarQube', 'SAST', 'Static code analysis for quality and security', 'docker pull sonarqube:latest', 'sonar-scanner -Dsonar.projectKey=myproject', true),
('Bandit', 'SAST', 'Python security vulnerability scanner', 'pip install bandit', 'bandit -r ./', true),
('ESLint Security', 'SAST', 'JavaScript security rules for ESLint', 'npm install eslint-plugin-security', 'eslint --ext .js,.jsx .', false),
('OWASP ZAP', 'DAST', 'Web application security scanner', 'docker pull owasp/zap2docker-stable', 'zap-baseline.py -t', true),
('Nikto', 'DAST', 'Web server vulnerability scanner', 'apt-get install nikto', 'nikto -h', true),
('Burp Suite', 'DAST', 'Advanced web application testing', 'wget https://portswigger.net/burp/releases/download', 'java -jar burpsuite.jar', false)
ON CONFLICT DO NOTHING;