import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const STORAGE_KEY = "@holidays_data";
const { height } = Dimensions.get("window");

const AboutView = ({ onBack, theme }: { onBack: () => void; theme: any }) => (
  <View style={{ flex: 1 }}>
    {/* Content Wrapper */}
    <View style={{ flex: 1 }}>
      <Text style={[styles.settingsTitle, { color: theme.text }]}>ABOUT</Text>

      <View style={{ marginTop: 10 }}>
        {/* Version and Copyright at the top */}
        
        
        <Text style={[styles.aboutBody, { color: theme.text, fontWeight: '700' }]}>
          Minimalist Calendar
        </Text>
        <Text style={[styles.aboutBody, { color: theme.subText, marginBottom: 15 }]}>
          Designed for clarity, built for focus.
        </Text>
        
        <Text style={[styles.aboutSub, { color: theme.subText, lineHeight: 22, marginBottom: 20 }]}>
          A clean and distraction-free calendar designed to help you focus on what matters.
        </Text>

        <Text style={[styles.aboutBody, { color: theme.text, fontWeight: '600', fontSize: 18 }]}>Features</Text>
        <Text style={[styles.aboutSub, { color: theme.subText, marginBottom: 15 }]}>
          • Minimal interface{"\n"}
          • Holiday awareness{"\n"}
          • Dark & light themes
        </Text>

        <Text style={[styles.aboutBody, { color: theme.text, fontWeight: '600', fontSize: 18 }]}>Technology</Text>
        <Text style={[styles.aboutSub, { color: theme.subText, marginBottom: 15 }]}>
          Built with React Native & Expo
        </Text>

        <Text style={[styles.aboutBody, { color: theme.text, fontWeight: '600', fontSize: 18 }]}>Data</Text>
        <Text style={[styles.aboutSub, { color: theme.subText }]}>
          Open Source Holiday Data
        </Text>
        <Text style={[styles.aboutSub, { color: theme.subText, marginBottom: 5 }]}>
          v1.0.0
        </Text>
        <Text style={[styles.aboutSub, { color: theme.subText, marginBottom: 25, fontSize: 14 }]}>
          © 2026 theStudio
        </Text>
      </View>
    </View>

    {/* Back Button Pinned to Bottom */}
    <Pressable 
      style={[styles.closeButton, { marginBottom: 40 }]} 
      onPress={onBack}
    >
      <Text style={styles.closeButtonText}>BACK</Text>
    </Pressable>
  </View>
);

export default function CalendarHome() {
  const now = new Date();
  const [viewDate, setViewDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [holidayMap, setHolidayMap] = useState<Record<string, string>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  // UI States
  const slideAnim = useRef(new Animated.Value(-height)).current;
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const isSwiping = useRef(false);

  // Theme Logic: Light mode stays exactly as your original preview
  const theme = {
    bg: isDarkMode ? "#333" : "#fff",
    text: isDarkMode ? "#fff" : "#333",
    subText: isDarkMode ? "#bbb" : "#666",
    gridFuture: isDarkMode ? "#444" : "#666",
    gridPast: isDarkMode ? "#222" : "#333",
  };

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
      const year = viewDate.getFullYear();
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
    if (!show) setTimeout(() => setShowAbout(false), 300);
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

  // Dynamic Row Logic Restored
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
        if (Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
          if (gesture.dx > 60) handleSwipe("PREV");
          else if (gesture.dx < -60) handleSwipe("NEXT");
        } else if (gesture.dy > 60 && gesture.y0 < 250) {
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
    <View
      style={[styles.container, { backgroundColor: theme.bg }]}
      {...panResponder.panHandlers}
    >
      {/* Settings Overlay */}
      <Animated.View
        style={[
          styles.settingsPanel,
          { backgroundColor: theme.bg, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.settingsContent}>
          {!showAbout ? (
            <>
              <Text style={[styles.settingsTitle, { color: theme.text }]}>
                SETTINGS
              </Text>
              <Text style={[styles.yearText, { color: theme.subText }]}>
                Calendar: AD
              </Text>

              <Pressable onPress={() => setIsDarkMode(!isDarkMode)}>
                <Text style={[styles.yearText, { color: theme.subText }]}>
                  Theme: {isDarkMode ? "Dark" : "Light"}
                </Text>
              </Pressable>

              <Pressable onPress={() => setShowAbout(true)}>
                <Text style={[styles.yearText, { color: theme.subText }]}>
                  About
                </Text>
              </Pressable>

              <Pressable
                style={styles.closeButton}
                onPress={() => toggleSettings(false)}
              >
                <Text style={styles.closeButtonText}>CLOSE</Text>
              </Pressable>
            </>
          ) : (
            <AboutView onBack={() => setShowAbout(false)} theme={theme} />
          )}
        </View>
      </Animated.View>

      {/* Header */}
      <View style={styles.row}>
        <Pressable
          onPress={() =>
            setViewDate(new Date(now.getFullYear(), now.getMonth(), 1))
          }
        >
          <Text style={[styles.dateText, { color: theme.text }]}>
            {now.getDate().toString().padStart(2, "0")}
          </Text>
          <Text style={[styles.weekdayText, { color: theme.subText }]}>
            {now.toLocaleDateString("en-US", { weekday: "long" })}
          </Text>
        </Pressable>
        <View style={styles.rightColumn}>
          <Text style={[styles.monthText, { color: theme.text }]}>
            {monthName}
          </Text>
          <Text style={[styles.yearText, { color: theme.subText }]}>
            {viewYear}
          </Text>
          {isSyncing && (
            <ActivityIndicator
              size="small"
              color="#FB6A03"
              style={{ marginTop: 5 }}
            />
          )}
        </View>
      </View>

      {/* Week Row */}
      <View style={styles.weekRow}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => {
          // This logic only looks at today's day of the week
          const isTodayName = i === now.getDay();

          return (
            <View key={i} style={styles.dayBox}>
              <Text
                style={[
                  styles.dayText,
                  isTodayName
                    ? { color: "#FB6A03", fontWeight: "bold" }
                    : { color: theme.subText },
                ]}
              >
                {d}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Calendar Grid - Uses dynamic numRows */}
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
                              ? theme.gridPast
                              : theme.gridFuture
                            : "transparent",
                      borderWidth: !isValid ? 2 : 0,
                      borderColor: !isValid ? theme.gridPast : "transparent",
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
            <Text style={[styles.selectedDateDay, { color: theme.text }]}>
              {new Date(viewYear, viewMonth, selectedDate).toLocaleDateString(
                "en-US",
                { weekday: "long" },
              )}
            </Text>
            <Text
              style={[styles.selectedDateFull, { color: theme.subText }]}
            >{`${selectedDate} ${monthName} ${viewYear}`}</Text>
            {holidayMap[getDateKey(selectedDate)] && (
              <Text style={[styles.eventTitleText, { color: theme.text }]}>
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
  container: { flex: 1, padding: 10, paddingTop: 110 },
  settingsPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height,
    zIndex: 1000,
  },
  settingsContent: {
    flex: 1,
    paddingTop: 100,
    paddingHorizontal: 30,
    justifyContent: "flex-start",
  },
  settingsTitle: { fontSize: 44, fontWeight: "600", marginBottom: 10 },
  closeButton: { paddingVertical: 10 },
  closeButtonText: { fontSize: 44, fontWeight: "600", color: "#FB6A03" },
  aboutBody: { fontSize: 22, marginBottom: 10, fontWeight: "500" },
  aboutSub: { fontSize: 18, marginBottom: 20, fontWeight: "400" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  dateText: { fontSize: 160, fontWeight: "bold" },
  weekdayText: {
    fontSize: 40,
    fontWeight: "600",
    marginTop: -20,
    paddingLeft: 10,
  },
  rightColumn: { alignItems: "flex-end" },
  monthText: { fontSize: 48, fontWeight: "600", paddingRight: 10 },
  yearText: { fontSize: 44, fontWeight: "600", paddingRight: 10 },
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
  dayText: { fontSize: 18, fontWeight: "600" },
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
  selectedDateDay: { fontSize: 46, fontWeight: "bold" },
  selectedDateFull: { fontSize: 32, fontWeight: "600" },
  eventTitleText: { fontSize: 46, fontWeight: "bold", marginTop: 10 },
});
