package com.taskforce.users;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
public class UserService {

    private final ProfileRepository profileRepository;
    private final SchedulePreferencesRepository prefsRepository;

    public UserService(ProfileRepository profileRepository,
                       SchedulePreferencesRepository prefsRepository) {
        this.profileRepository = profileRepository;
        this.prefsRepository = prefsRepository;
    }

    @Transactional
    public Profile getProfile(String userId) {
        UUID uid = UUID.fromString(userId);
        return profileRepository.findById(uid).orElseGet(() -> {
            Profile p = new Profile();
            p.setId(uid);
            return profileRepository.save(p);
        });
    }

    @Transactional
    public Profile updateProfile(String userId, UpdateProfileRequest req) {
        Profile profile = getProfile(userId);

        if (req.getDisplayName() != null) profile.setDisplayName(req.getDisplayName());
        if (req.getAvatarUrl() != null)   profile.setAvatarUrl(req.getAvatarUrl());
        if (req.getTimezone() != null)    profile.setTimezone(req.getTimezone());

        return profileRepository.save(profile);
    }

    public SchedulePreferences getPreferences(String userId) {
        UUID uid = UUID.fromString(userId);
        return prefsRepository.findById(uid).orElseGet(() -> {
            SchedulePreferences defaults = new SchedulePreferences();
            defaults.setUserId(uid);
            return defaults;
        });
    }

    @Transactional
    public SchedulePreferences updatePreferences(String userId, PreferencesRequest req) {
        SchedulePreferences prefs = getPreferences(userId);
        prefs.setUserId(UUID.fromString(userId));
        if (req.getWorkStartTime()       != null) prefs.setWorkStartTime(req.getWorkStartTime());
        if (req.getWorkEndTime()         != null) prefs.setWorkEndTime(req.getWorkEndTime());
        if (req.getWorkDays()            != null) prefs.setWorkDays(req.getWorkDays());
        if (req.getPreferredFocusHours() != null) prefs.setPreferredFocusHours(req.getPreferredFocusHours());
        if (req.getBreakDurationMinutes()!= null) prefs.setBreakDurationMinutes(req.getBreakDurationMinutes());
        if (req.getMaxDailyTasks()       != null) prefs.setMaxDailyTasks(req.getMaxDailyTasks());
        return prefsRepository.save(prefs);
    }
}
