package com.taskforce.users;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
public class UserService {

    private final ProfileRepository profileRepository;

    public UserService(ProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    public Profile getProfile(String userId) {
        return profileRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
    }

    @Transactional
    public Profile updateProfile(String userId, UpdateProfileRequest req) {
        Profile profile = getProfile(userId);

        if (req.getDisplayName() != null) profile.setDisplayName(req.getDisplayName());
        if (req.getAvatarUrl() != null)   profile.setAvatarUrl(req.getAvatarUrl());
        if (req.getTimezone() != null)    profile.setTimezone(req.getTimezone());

        return profileRepository.save(profile);
    }
}
