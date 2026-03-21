package com.alibou.websocket.note;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/note")
@RequiredArgsConstructor
public class NoteController2 {

    private final NoteService noteService;

    @GetMapping
    public ResponseEntity<NoteData> getNote() {
        return ResponseEntity.ok(noteService.getNote());
    }

    @PostMapping
    public ResponseEntity<NoteData> saveNote(@RequestBody NoteData noteData) {
        NoteData saved = noteService.saveNote(noteData.getContent());
        return ResponseEntity.ok(saved);
    }
}