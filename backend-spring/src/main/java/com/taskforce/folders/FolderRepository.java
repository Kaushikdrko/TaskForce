package com.taskforce.folders;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FolderRepository extends JpaRepository<Folder, UUID> {

    List<Folder> findByUserIdOrderByName(UUID userId);

    Optional<Folder> findByIdAndUserId(UUID id, UUID userId);
}
