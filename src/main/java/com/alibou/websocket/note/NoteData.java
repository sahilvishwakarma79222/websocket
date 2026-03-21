package com.alibou.websocket.note;

import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class NoteData {
    private String content;
    private long timestamp;
}