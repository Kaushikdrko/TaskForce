package com.taskforce.tickets;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class TicketRequest {

    @NotBlank
    @Size(max = 200)
    private String subject;

    @Size(max = 5000)
    private String description;

    @Size(max = 20)
    private String priority;
}
