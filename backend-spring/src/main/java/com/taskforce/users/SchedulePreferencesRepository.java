package com.taskforce.users;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SchedulePreferencesRepository extends JpaRepository<SchedulePreferences, UUID> {
}
