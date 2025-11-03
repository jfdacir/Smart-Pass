-- Drop existing database and recreate
DROP DATABASE IF EXISTS smartpass;
CREATE DATABASE smartpass;
USE smartpass;

-- Users table with email
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('Super Admin', 'System Admin', 'Department Head', 'Counselor', 'Professor', 'Student') NOT NULL,
  dept VARCHAR(200),
  account_status ENUM('Active', 'Pending', 'Suspended') DEFAULT 'Active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pending users table with email
CREATE TABLE pending_users (
  id VARCHAR(50) PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  department VARCHAR(200) NOT NULL,
  role ENUM('Student', 'Professor', 'Department Head', 'Counselor', 'System Admin', 'Super Admin') NOT NULL,
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  decided_by VARCHAR(50),
  decided_at DATETIME
);

-- Courses table
CREATE TABLE courses (
  course_id VARCHAR(20) PRIMARY KEY,
  course_name VARCHAR(200) NOT NULL,
  dept VARCHAR(200) NOT NULL,
  professor_id VARCHAR(50),
  schedule VARCHAR(100),
  FOREIGN KEY (professor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Course enrollments
CREATE TABLE course_students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id VARCHAR(20),
  student_id VARCHAR(50),
  FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (course_id, student_id)
);

-- RFID cards
CREATE TABLE rfid_cards (
  card_number VARCHAR(20) PRIMARY KEY,
  student_id VARCHAR(50),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Attendance logs
CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(50),
  course_id VARCHAR(20),
  date DATE NOT NULL,
  status ENUM('Present', 'Late', 'Absent', 'Excused') NOT NULL,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

-- Messages
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id VARCHAR(50),
  recipient_id VARCHAR(50),
  subject VARCHAR(200),
  message TEXT,
  date DATE,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Wellness logs
CREATE TABLE wellness_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(50),
  date DATE NOT NULL,
  mood ENUM('Happy', 'Okay', 'Fine', 'Not Okay') NOT NULL,
  factors JSON,
  wants_meeting BOOLEAN DEFAULT FALSE,
  slot VARCHAR(10),
  note TEXT,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Events (counseling appointments)
CREATE TABLE events (
  id VARCHAR(20) PRIMARY KEY,
  student_id VARCHAR(50),
  counselor_id VARCHAR(50),
  mood VARCHAR(20),
  meeting_date DATE,
  slot VARCHAR(10),
  note TEXT,
  status ENUM('Pending', 'Approved', 'Declined', 'Rescheduled') DEFAULT 'Pending',
  response_note TEXT,
  history JSON,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tickets
CREATE TABLE tickets (
  id VARCHAR(20) PRIMARY KEY,
  subject VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
  status ENUM('Open', 'Resolved') DEFAULT 'Open',
  details TEXT,
  owner_id VARCHAR(50),
  requestor_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  resolved_by VARCHAR(100),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (requestor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Approvals
CREATE TABLE approvals (
  id VARCHAR(20) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  submitted_by VARCHAR(100),
  detail TEXT,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  decided_at TIMESTAMP NULL,
  decided_by VARCHAR(100)
);

-- System logs
CREATE TABLE system_logs (
  id VARCHAR(20) PRIMARY KEY,
  category VARCHAR(50),
  severity ENUM('Info', 'Warning', 'Error', 'Critical') DEFAULT 'Info',
  action VARCHAR(100),
  detail TEXT,
  actor VARCHAR(100),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  meta JSON
);

-- Insert sample users (6 users - one per role)
INSERT INTO users (id, name, email, password, role, dept, account_status) VALUES
('S2', 'Noah Reyes', 'noahr@smartpass.edu', '123', 'Student', 'School of Information Technology (SOIT)', 'Active'),
('SU1', 'Super Admin', 'superadmin@smartpass.edu', '123', 'Super Admin', NULL, 'Active'),
('SA1', 'System Admin', 'sysadmin@smartpass.edu', '123', 'System Admin', NULL, 'Active'),
('DH1', 'Dr. Maria Santos', 'maria.santos@smartpass.edu', '123', 'Department Head', 'School of Information Technology (SOIT)', 'Active'),
('C1', 'Dr. Sarah Thompson', 'sarah.thompson@smartpass.edu', '123', 'Counselor', NULL, 'Active'),
('P1', 'Prof. Anna Wilson', 'anna.wilson@smartpass.edu', '123', 'Professor', 'Department of Liberal Arts (DLA)', 'Active'),
('S1', 'Ava Smith', 'ava.smith@smartpass.edu', '123', 'Student', 'School of Information Technology (SOIT)', 'Active');

-- Insert sample courses
INSERT INTO courses (course_id, course_name, dept, professor_id, schedule) VALUES
('IT101', 'Programming Fundamentals', 'School of Information Technology (SOIT)', NULL, 'MWF 9:00-10:30 AM'),
('IT102', 'Data Structures and Algorithms', 'School of Information Technology (SOIT)', NULL, 'TTH 1:00-2:30 PM'),
('DLA101', 'Introduction to Literature', 'Department of Liberal Arts (DLA)', 'P1', 'MWF 10:30-12:00 PM');