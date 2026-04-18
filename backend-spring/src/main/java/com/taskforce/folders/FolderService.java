package com.taskforce.folders;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class FolderService {

    private final FolderRepository folderRepository;

    public FolderService(FolderRepository folderRepository) {
        this.folderRepository = folderRepository;
    }

    public List<Folder> list(String userId) {
        return folderRepository.findByUserIdOrderByName(UUID.fromString(userId));
    }

    @Transactional
    public Folder create(String userId, FolderRequest req) {
        Folder folder = new Folder();
        folder.setUserId(UUID.fromString(userId));
        applyRequest(folder, req);
        if (folder.getColor() == null) folder.setColor("#6366f1");
        return folderRepository.save(folder);
    }

    public Folder get(String userId, UUID id) {
        return folderRepository.findByIdAndUserId(id, UUID.fromString(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));
    }

    @Transactional
    public Folder update(String userId, UUID id, FolderRequest req) {
        Folder folder = get(userId, id);
        applyRequest(folder, req);
        return folderRepository.save(folder);
    }

    @Transactional
    public void delete(String userId, UUID id) {
        folderRepository.delete(get(userId, id));
    }

    private void applyRequest(Folder folder, FolderRequest req) {
        folder.setName(req.getName());
        if (req.getColor() != null) folder.setColor(req.getColor());
        if (req.getIcon()  != null) folder.setIcon(req.getIcon());
    }
}
