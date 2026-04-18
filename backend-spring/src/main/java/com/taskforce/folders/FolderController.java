package com.taskforce.folders;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/folders")
public class FolderController {

    private final FolderService folderService;

    public FolderController(FolderService folderService) {
        this.folderService = folderService;
    }

    @GetMapping
    public ResponseEntity<List<Folder>> list(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(folderService.list(userId));
    }

    @PostMapping
    public ResponseEntity<Folder> create(@AuthenticationPrincipal String userId,
                                         @Valid @RequestBody FolderRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(folderService.create(userId, req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Folder> update(@AuthenticationPrincipal String userId,
                                         @PathVariable UUID id,
                                         @Valid @RequestBody FolderRequest req) {
        return ResponseEntity.ok(folderService.update(userId, id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal String userId,
                                       @PathVariable UUID id) {
        folderService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
