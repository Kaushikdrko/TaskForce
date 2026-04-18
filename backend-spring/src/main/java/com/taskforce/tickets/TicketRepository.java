package com.taskforce.tickets;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TicketRepository extends JpaRepository<Ticket, UUID> {

    List<Ticket> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<Ticket> findByIdAndUserId(UUID id, UUID userId);
}
