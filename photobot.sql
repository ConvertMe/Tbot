CREATE TABLE users (
  id int NOT NULL AUTO_INCREMENT,
  login varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  phone varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  name varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  lastResComplexId int DEFAULT NULL ,
  role varchar(300) NOT NULL DEFAULT 'user',
  isDisabled tinyint(1) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY login (login)
);

CREATE TABLE session (
  id int NOT NULL AUTO_INCREMENT,
  hash  varchar(300) NOT NULL,
  userId int NOT NULL,
  launched tinyint(1) NOT NULL DEFAULT 0,
  session JSON NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY userId (userId)
);

CREATE TABLE complex (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE queueForReverseGeocoding (
  id int NOT NULL AUTO_INCREMENT,
  chatId varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  userId int NOT NULL,
  latitude varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  longitude varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE garbageСollectorFiles (
  id int NOT NULL AUTO_INCREMENT,
  pathToFile varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);