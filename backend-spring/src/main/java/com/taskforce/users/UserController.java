package com.taskforce.users;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<Profile> getMe(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(userService.getProfile(userId));
    }

    @PutMapping("/me")
    public ResponseEntity<Profile> updateMe(@AuthenticationPrincipal String userId,
                                            @Valid @RequestBody UpdateProfileRequest req) {
        return ResponseEntity.ok(userService.updateProfile(userId, req));
    }

    @GetMapping("/me/preferences")
    public ResponseEntity<SchedulePreferences> getPreferences(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(userService.getPreferences(userId));
    }

    @PutMapping("/me/preferences")
    public ResponseEntity<SchedulePreferences> updatePreferences(@AuthenticationPrincipal String userId,
                                                                  @RequestBody PreferencesRequest req) {
        return ResponseEntity.ok(userService.updatePreferences(userId, req));
    }
}
