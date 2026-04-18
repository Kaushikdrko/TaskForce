package com.taskforce.folders;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class FolderRequest {

    @NotBlank
    @Size(max = 100)
    private String name;

    @Size(max = 20)
    private String color;

    @Size(max = 50)
    private String icon;
}
