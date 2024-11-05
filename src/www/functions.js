function formatTime(time) {
    if (String(time).length == 1) {
        return 0 + time;
    } 
    return String(time);
}