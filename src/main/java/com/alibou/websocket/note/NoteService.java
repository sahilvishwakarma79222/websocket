package com.alibou.websocket.note;

import org.springframework.stereotype.Service;
import java.nio.file.*;

@Service
public class NoteService {

    private static final String NOTE_FILE = "note.txt";

    public NoteData getNote() {
        try {
            Path path = Paths.get(NOTE_FILE);
            if (Files.exists(path)) {
                String raw = new String(Files.readAllBytes(path));
                String[] parts = raw.split("\n", 2);
                long timestamp = Long.parseLong(parts[0].trim());
                String content = parts.length > 1 ? parts[1] : "";
                return new NoteData(content, timestamp);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return new NoteData("", 0);
    }

    public NoteData saveNote(String content) {
        long timestamp = System.currentTimeMillis();
        try {
            Files.write(
                Paths.get(NOTE_FILE),
                (timestamp + "\n" + content).getBytes()
            );
        } catch (Exception e) {
            e.printStackTrace();
        }
        return new NoteData(content, timestamp);
    }
}