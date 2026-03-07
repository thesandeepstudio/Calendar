import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated, // Added
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const STORAGE_KEY = "@holidays_data";
const { height } = Dimensions.get("window"); // To determine slide distance

export default function CalendarHome() {
  const now = new Date();
  const [viewDate, setViewDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [holidayMap, setHolidayMap] = useState<Record<string, string>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  // Animation state
  const slideAnim = useRef(new Animated.Value(-height)).current;
  const [settingsVisible, setSettingsVisible] = useState(false);

  const isSwiping = useRef(false);

  useEffect(() => {
    loadLocalData();
  }, []);

  const loadLocalData = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setHolidayMap(JSON.parse(stored));
      else syncHolidaysWithAPI();
    } catch (e) {
      console.error("Failed to load offline holidays", e);
    }
  };

  const syncHolidaysWithAPI = async () => {
    setIsSyncing(true);
    try {
      const year = now.getFullYear();
      const response = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/US`,
      );
      const data = await response.json();
      const newMap: Record<string, string> = {};
      data.forEach((h: any) => {
        newMap[h.date] = h.localName;
      });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newMap));
      setHolidayMap(newMap);
    } catch (e) {
      console.error("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleSettings = (show: boolean) => {
    setSettingsVisible(show);
    Animated.timing(slideAnim, {
      toValue: show ? 0 : -height,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const viewMonth = viewDate.getMonth();
  const viewYear = viewDate.getFullYear();
  const monthName = viewDate.toLocaleDateString("en-US", { month: "long" });

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();

  const totalSlotsNeeded = firstDayOfMonth + daysInMonth;
  const numRows = totalSlotsNeeded > 35 ? 6 : 5;
  const totalCells = numRows * 7;

  const dates = Array.from(
    { length: totalCells },
    (_, i) => i - firstDayOfMonth + 1,
  );

  const getDateKey = (day: number) => {
    const m = (viewMonth + 1).toString().padStart(2, "0");
    const d = day.toString().padStart(2, "0");
    return `${viewYear}-${m}-${d}`;
  };

  const handleDatePress = (date: number) => {
    setSelectedDate(selectedDate === date ? null : date);
  };

  const handleSwipe = (direction: "NEXT" | "PREV") => {
    if (isSwiping.current) return;
    isSwiping.current = true;
    setViewDate(
      (prev) =>
        new Date(
          prev.getFullYear(),
          prev.getMonth() + (direction === "NEXT" ? 1 : -1),
          1,
        ),
    );
    setSelectedDate(null);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 20 || Math.abs(gesture.dy) > 20,
      onPanResponderRelease: (_, gesture) => {
        // Horizontal Swipes
        if (Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
          if (gesture.dx > 60) handleSwipe("PREV");
          else if (gesture.dx < -60) handleSwipe("NEXT");
        }
        // Vertical Swipes (Top area check)
        else if (gesture.dy > 60 && gesture.y0 < 250) {
          toggleSettings(true);
        }
        isSwiping.current = false;
      },
    }),
  ).current;

  const activeDayIndex = selectedDate
    ? new Date(viewYear, viewMonth, selectedDate).getDay()
    : now.getDay();

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Settings Overlay - Slides from Top */}
      <Animated.View
        style={[
          styles.settingsPanel,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.settingsContent}>
          <Text style={styles.settingsTitle}>SETTINGS</Text>
          <Text style={styles.yearText}>Holiday Sync: US</Text>
          <Pressable
            style={styles.closeButton}
            onPress={() => toggleSettings(false)}
          >
            <Text style={styles.closeButtonText}>CLOSE</Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* Header */}
      <View style={styles.row}>
        <Pressable
          onPress={() =>
            setViewDate(new Date(now.getFullYear(), now.getMonth(), 1))
          }
        >
          <Text style={styles.dateText}>
            {now.getDate().toString().padStart(2, "0")}
          </Text>
          <Text style={styles.weekdayText}>
            {now.toLocaleDateString("en-US", { weekday: "long" })}
          </Text>
        </Pressable>
        <View style={styles.rightColumn}>
          <Text style={styles.monthText}>{monthName}</Text>
          <Text style={styles.yearText}>{viewYear}</Text>
          {isSyncing && (
            <ActivityIndicator
              size="small"
              color="#FB6A03"
              style={{ marginTop: 5 }}
            />
          )}
        </View>
      </View>

      {/* Week Labels */}
      <View style={styles.weekRow}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <View key={i} style={styles.dayBox}>
            <Text
              style={[
                styles.dayText,
                i === activeDayIndex && {
                  color: "#FB6A03",
                  fontWeight: "bold",
                },
              ]}
            >
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {Array.from({ length: numRows }).map((_, row) => (
          <View key={row} style={styles.gridRow}>
            {dates.slice(row * 7, row * 7 + 7).map((date, i) => {
              const isValid = date > 0 && date <= daysInMonth;
              const isToday =
                date === now.getDate() &&
                viewMonth === now.getMonth() &&
                viewYear === now.getFullYear();
              const isPast =
                isValid &&
                new Date(viewYear, viewMonth, date) <
                  new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const isSelected = date === selectedDate;

              return (
                <View
                  key={i}
                  style={[
                    styles.dateCircle,
                    {
                      backgroundColor: isSelected
                        ? "#22C55E"
                        : isToday
                          ? "#FB6A03"
                          : isValid
                            ? isPast
                              ? "#333"
                              : "#666"
                            : "transparent",
                      borderWidth: !isValid ? 2 : 0,
                      borderColor: !isValid ? "#666" : "transparent",
                    },
                  ]}
                >
                  <Pressable
                    style={styles.pressableArea}
                    onPress={() => isValid && handleDatePress(date)}
                  >
                    {isValid && holidayMap[getDateKey(date)] && (
                      <View
                        style={[
                          styles.eventDot,
                          (isSelected || isToday) && {
                            backgroundColor: "#fff",
                          },
                        ]}
                      />
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {selectedDate && (
          <>
            <Text style={styles.selectedDateDay}>
              {new Date(viewYear, viewMonth, selectedDate).toLocaleDateString(
                "en-US",
                { weekday: "long" },
              )}
            </Text>
            <Text
              style={styles.selectedDateFull}
            >{`${selectedDate} ${monthName} ${viewYear}`}</Text>
            {holidayMap[getDateKey(selectedDate)] && (
              <Text style={styles.eventTitleText}>
                {holidayMap[getDateKey(selectedDate)]}
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: "#fff", paddingTop: 80 },
  // Settings Styles
  settingsPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "#fff",
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  settingsContent: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  settingsTitle: {
    fontSize: 44,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  closeButton: {
    marginTop: 40,
    paddingVertical: 10,
  },
  closeButtonText: {
    fontSize: 44,       // Matches your year/settings font size
    fontWeight: "600",
    color: "#FB6A03",   // Your brand orange
  },
  // Existing Styles
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  dateText: { fontSize: 160, fontWeight: "bold", color: "#333" },
  weekdayText: {
    fontSize: 40,
    fontWeight: "600",
    color: "#666",
    marginTop: -20,
    paddingLeft: 10,
  },
  rightColumn: { alignItems: "flex-end" },
  monthText: {
    fontSize: 48,
    fontWeight: "600",
    paddingRight: 10,
    color: "#333",
  },
  yearText: {
    fontSize: 44,
    fontWeight: "600",
    paddingRight: 10,
    color: "#999",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginTop: 20,
  },
  dayBox: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  dayText: { fontSize: 18, fontWeight: "600", color: "#999" },
  calendarGrid: { marginTop: 10 },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  dateCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  pressableArea: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FB6A03",
    position: "absolute",
    bottom: 6,
  },
  footer: { marginTop: 20, paddingHorizontal: 10 },
  selectedDateDay: { fontSize: 46, fontWeight: "bold", color: "#333" },
  selectedDateFull: { fontSize: 32, fontWeight: "600", color: "#666" },
  eventTitleText: {
    fontSize: 46,
    fontWeight: "bold",
    color: "#333",
    marginTop: 10,
  },
});
