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
	"password" varchar NOT NULL,
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

-- Insert default tools
INSERT INTO "tools" ("name", "type", "description", "install_command", "run_command", "installed", "created_at") VALUES
('AFL++', 'DAST', 'Advanced American Fuzzy Lop fuzzer with improved performance', 'wget https://github.com/AFLplusplus/AFLplusplus/archive/stable.tar.gz && tar -xzf stable.tar.gz && cd AFLplusplus-stable && make && sudo make install', 'afl-fuzz', true, now()),
('libFuzzer', 'DAST', 'LLVM in-process fuzzing library for coverage-guided fuzzing', 'apt-get install clang', 'clang -fsanitize=fuzzer', true, now()),
('afl-ruby', 'DAST', 'Ruby fuzzing framework based on AFL', 'gem install afl-ruby', 'afl-ruby', true, now()),
('OWASP ZAP', 'DAST', 'Web application security scanner', 'docker pull owasp/zap2docker-stable', 'zap-baseline.py -t', true, now()),
('Nikto', 'DAST', 'Web server vulnerability scanner', 'apt-get install nikto', 'nikto -h', true, now()),
('Semgrep', 'SAST', 'Static analysis tool for finding bugs and security issues', 'python3 -m pip install --user semgrep', 'semgrep --config=auto', true, now()),
('SonarQube', 'SAST', 'Continuous code quality and security analysis platform', 'docker pull sonarqube', 'sonar-scanner', true, now()),
('RubyCritic', 'SAST', 'Ruby code quality analysis tool', 'gem install rubycritic', 'rubycritic', false, now()),
('RuboCop', 'SAST', 'Ruby static code analyzer and formatter', 'nix-env -iA nixpkgs.rubocop', 'rubocop', true, now()),
('dewrapper', 'WRAPPER_GEN', 'Ruby fuzzing wrapper generator using transform.py', 'python3 -m pip install --user ruby-transform', 'python3 transform.py', true, now()),
('futage', 'WRAPPER_GEN', 'C/C++ fuzzing wrapper generator', 'git clone https://github.com/futage/futage && cd futage && make install', 'futage', true, now()),
('PyFuzzWrap', 'WRAPPER_GEN', 'Python fuzzing wrapper generator', 'python3 -m pip install --user pyfuzzwrap', 'pyfuzzwrap', false, now())
ON CONFLICT DO NOTHING;

-- Insert default users
INSERT INTO "users" ("id", "email", "password", "first_name", "last_name", "role", "created_at", "updated_at") VALUES
('admin_1', 'admin@example.com', 'admin123', 'Admin', 'User', 'admin', now(), now()),
('user_1', 'user@example.com', 'user123', 'Regular', 'User', 'user', now(), now())
ON CONFLICT DO NOTHING;