#!/usr/bin/env python3
"""
SoberMind // Python CLI Autopilot Interrupter
============================================
A fully functional terminal-based mindfulness timer designed to intercept
subconscious work-flow distractions (e.g., social media, checking news)
using structured breathing delays.

Usage:
  python sobermind.py [impulse] [--duration 90] [--mode breath|zen]
"""

import sys
import time
import argparse
import datetime
import os

# Configure stdout, stderr, and stdin to UTF-8 to prevent encoding errors on Windows/other systems
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    sys.stdin.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# Color console codes
CYAN = "\033[96m"
MAGENTA = "\033[95m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RESET = "\033[0m"
BOLD = "\033[1m"
CLEAR_LINE = "\033[K"
HIDE_CURSOR = "\033[?25l"
SHOW_CURSOR = "\033[?25h"

def get_log_filepath():
    home = os.path.expanduser("~")
    log_dir = os.path.join(home, ".sobermind")
    try:
        os.makedirs(log_dir, exist_ok=True)
    except Exception:
        # Fallback to home dir directly if we can't create the directory
        return os.path.join(home, ".sobermind_cli.log")
    return os.path.join(log_dir, "sobermind_cli.log")

def print_banner(impulse):
    print(f"\n{BOLD}{CYAN}🌌 SOBERMIND // Terminal Autopilot Interrupter{RESET}")
    print("=" * 50)
    print(f"⚠️  {BOLD}IMPULSE INTERCEPTED:{RESET} {YELLOW}{impulse}{RESET}")
    print("Give your brain a moment to re-calibrate. Focus on the guide below.")
    print("=" * 50 + "\n")

def get_breath_bubble(state, count):
    # Generates ASCII art breathing guides
    if state == "IN":
        # Grow bubble size
        size = 1 + count
        return f"({'.' * size} o {'.' * size})"
    elif state == "HOLD":
        # Full bubble
        return "(● ● ● HOLD ● ● ●)"
    else: # OUT
        # Shrink bubble
        size = 5 - count
        return f"({'.' * size} . {'.' * size})"

def run_timer(duration, mode):
    # Set console cursor visibility
    sys.stdout.write(HIDE_CURSOR)
    sys.stdout.flush()

    try:
        start_time = time.time()
        time_left = duration

        # Breathing phase states
        breath_state = "IN" # IN, HOLD, OUT
        breath_count = 0

        while time_left > 0:
            # 1. Update breathing guide pacing (4-7-8 rhythm)
            if mode == "breath":
                if breath_state == "IN":
                    breath_count += 1
                    if breath_count >= 4:
                        breath_state = "HOLD"
                        breath_count = 0
                elif breath_state == "HOLD":
                    breath_count += 1
                    if breath_count >= 7:
                        breath_state = "OUT"
                        breath_count = 0
                else: # OUT
                    breath_count += 1
                    if breath_count >= 8:
                        breath_state = "IN"
                        breath_count = 0

                state_color = CYAN if breath_state == "IN" else (MAGENTA if breath_state == "HOLD" else GREEN)
                bubble_art = get_breath_bubble(breath_state, breath_count)
                status_text = f"{state_color}{BOLD}{breath_state:4s}{RESET} {state_color}{bubble_art}{RESET}"
            else:
                status_text = f"{MAGENTA}Allow your thoughts to settle in still silence...{RESET}"

            # Draw progress details
            percent = (time_left / duration)
            progress_bar = "█" * int(percent * 20) + "░" * (20 - int(percent * 20))
            
            # Print ticks carriage return
            sys.stdout.write(f"\r⏳ {BOLD}{time_left:3d}s{RESET} [{progress_bar}] • {status_text}{CLEAR_LINE}")
            sys.stdout.flush()

            time.sleep(1)
            time_left = int(duration - (time.time() - start_time))

        # Finish chime/beep
        sys.stdout.write("\a") # Terminal bell chime
        sys.stdout.flush()
        print(f"\r✨ {BOLD}{GREEN}PAUSE COMPLETE{RESET} [████████████████████] • Dopamine reset complete!{CLEAR_LINE}\n")

    finally:
        sys.stdout.write(SHOW_CURSOR)
        sys.stdout.flush()

def log_reflection(impulse, duration):
    print("=" * 50)
    print(f"{BOLD}What is your conscious choice now?{RESET}")
    print(f"  {BOLD}{CYAN}[p]{RESET} Pivot (Choose a constructive replacement activity)")
    print(f"  {BOLD}{GREEN}[m]{RESET} Proceed Mindfully (Continue with conscious awareness)")
    print(f"  {BOLD}{YELLOW}[s]{RESET} Autopilot Slip (Acknowledge a lapse)")
    print("=" * 50)
    
    choice = ""
    while choice not in ["p", "m", "s"]:
        try:
            choice = input("Enter choice (p/m/s or type ? for help): ").strip().lower()
        except (KeyboardInterrupt, EOFError):
            print("\n")
            choice = "s"
            
        if choice in ["?", "help", "/"]:
            print("\n  Choices Explanation:")
            print(f"    {BOLD}Pivot [p]:{RESET} Redirect your chemical urge into a constructive action (e.g. drink water, stretch).")
            print(f"    {BOLD}Proceed [m]:{RESET} Continue to your original action, but with absolute mindful presence.")
            print(f"    {BOLD}Slip [s]:{RESET} Acknowledge that the autopilot impulse took over.")
            print("-" * 50 + "\n")
            choice = ""

    outcome = "slip"
    pivot_action = None
    if choice == "p":
        outcome = "pivot"
        print(f"\nSelect a healthy replacement pivot:")
        print("  1. Drink a glass of water 💧")
        print("  2. Do somatic stretching/walk 🧘")
        print("  3. Resume a core focus task ⏳")
        pivot_choice = input("Select option (1-3) or type custom: ").strip()
        
        if pivot_choice == "1":
            pivot_action = "Drink Water"
        elif pivot_choice == "2":
            pivot_action = "Somatic Stretching"
        elif pivot_choice == "3":
            pivot_action = "Deep Focus Task"
        else:
            pivot_action = pivot_choice if pivot_choice else "Constructive Pivot"
            
        print(f"\n{BOLD}{GREEN}✓ Bypassed!{RESET} Redirected impulse to: {pivot_action}.\n")
    elif choice == "m":
        outcome = "proceed"
        print(f"\n{BOLD}{GREEN}✓ Bypassed!{RESET} Proceeding mindfully with conscious awareness.\n")
    else:
        print(f"\n{BOLD}{YELLOW}! Slipped.{RESET} Acknowledged relapse to autopilot habits.\n")

    # Write session details into local log file
    try:
        log_file = get_log_filepath()
        with open(log_file, "a", encoding="utf-8") as f:
            timestamp = datetime.datetime.now().isoformat()
            f.write(f"{timestamp} | {impulse} | {duration}s | {outcome} | {pivot_action}\n")
    except Exception as e:
        print(f"Failed to save log details: {e}")

def print_help_manual():
    print(f"\n{BOLD}{CYAN}🌌 SOBERMIND // Command Line Help & Manual{RESET}")
    print("=" * 60)
    print(f"{BOLD}Usage:{RESET}  sobermind [impulse] [options]")
    print(f"        sobermind <command>")
    print("=" * 60)
    print(f"\n{BOLD}Available Commands:{RESET}")
    print(f"  {BOLD}help{RESET} or {BOLD}/{RESET} or {BOLD}?{RESET}      Display this help & configuration manual.")
    print(f"  {BOLD}stats{RESET} or {BOLD}log{RESET}        Inspect local habit interruption metrics & history.")
    print(f"  {BOLD}clear{RESET} or {BOLD}clean{RESET}      Reset and wipe local session log file.")
    print(f"\n{BOLD}Interrupter Options:{RESET}")
    print(f"  {BOLD}[impulse]{RESET}           The automatic action you want to intercept.")
    print(f"                      (Default: 'distracted task switch')")
    print(f"  {BOLD}--duration <sec>{RESET}   Urge delay duration in seconds. (Default: 90)")
    print(f"  {BOLD}--mode <mode>{RESET}       Grounding mode: {GREEN}breath{RESET} (4-7-8 rhythm) or {MAGENTA}zen{RESET} (silence).")
    print(f"\n{BOLD}Post-Timer Actions:{RESET}")
    print(f"  {BOLD}[p] Pivot{RESET}           Choose a constructive replacement activity.")
    print(f"  {BOLD}[m] Mindful{RESET}         Proceed with conscious awareness.")
    print(f"  {BOLD}[s] Slip{RESET}            Acknowledge a lapse back to autopilot.")
    print("=" * 60)
    print("Stay mindful. Give your prefrontal cortex time to lead.\n")

def print_stats():
    log_file = get_log_filepath()
    print(f"\n{BOLD}{CYAN}📊 SOBERMIND // Local Session Logs & Metrics{RESET}")
    print("=" * 60)
    
    if not os.path.exists(log_file):
        print(f"No logs found. Run {BOLD}sobermind{RESET} to log your first session!\n")
        return
        
    try:
        with open(log_file, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Error reading log file: {e}\n")
        return
        
    total_sessions = len(lines)
    if total_sessions == 0:
        print(f"Log file is empty. Run {BOLD}sobermind{RESET} to log your first session!\n")
        return
        
    successes = 0
    total_duration = 0
    outcomes = {"pivot": 0, "proceed": 0, "slip": 0, "aborted": 0}
    
    for line in lines:
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 4:
            outcome = parts[3].lower()
            if outcome in outcomes:
                outcomes[outcome] += 1
            if outcome in ["pivot", "proceed"]:
                successes += 1
            
            dur_str = parts[2].replace("s", "")
            try:
                total_duration += int(dur_str)
            except ValueError:
                pass
                
    bypass_rate = round((successes / total_sessions) * 100) if total_sessions > 0 else 0
    total_mins = round(total_duration / 60)
    
    print(f"  {BOLD}Total Sessions:{RESET}   {total_sessions}")
    print(f"  {BOLD}Urge Bypass Rate:{RESET} {GREEN if bypass_rate >= 70 else YELLOW}{bypass_rate}%{RESET}")
    print(f"  {BOLD}Total Time Paused:{RESET} {total_mins} minutes")
    print(f"  {BOLD}Breakdown:{RESET}        Pivots: {outcomes['pivot']} | Mindful: {outcomes['proceed']} | Slips: {outcomes['slip']}")
    print("-" * 60)
    print(f"{BOLD}Recent Activity (Last 5 sessions):{RESET}")
    
    recent_lines = lines[-5:]
    recent_lines.reverse()
    for line in recent_lines:
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 4:
            ts = parts[0][:16].replace("T", " ")
            impulse = parts[1]
            outcome = parts[3].upper()
            outcome_color = GREEN if outcome in ["PIVOT", "PROCEED"] else YELLOW
            pivot_act = f" ➔ {parts[4]}" if (len(parts) > 4 and parts[4] and parts[4] != "None") else ""
            print(f"  [{ts}] {impulse} • {outcome_color}{outcome}{RESET}{pivot_act}")
    print("=" * 60 + "\n")

def clear_stats():
    log_file = get_log_filepath()
    if not os.path.exists(log_file):
        print(f"\n{BOLD}No logs found to clear.{RESET}\n")
        return
        
    choice = input("\n⚠️  Are you sure you want to clear your local sobermind CLI logs? (y/n): ").strip().lower()
    if choice == "y":
        try:
            os.remove(log_file)
            print(f"{GREEN}✓ Successfully cleared log file.{RESET}\n")
        except Exception as e:
            print(f"Error deleting log file: {e}\n")
    else:
        print("Clear aborted.\n")

def main():
    # Intercept help, stats, and clear commands early to bypass argparse option validation if needed.
    # This ensures typing 'sobermind -?' or 'sobermind /?' doesn't print argparse option errors.
    if len(sys.argv) > 1:
        first_arg = sys.argv[1].strip().lower()
        if first_arg in ["help", "/", "?", "commands", "-h", "--help", "-?", "/?", "/h", "/help"]:
            print_help_manual()
            sys.exit(0)
        if first_arg in ["stats", "log", "logs", "history"]:
            print_stats()
            sys.exit(0)
        if first_arg in ["clear", "clean", "reset"]:
            clear_stats()
            sys.exit(0)

    parser = argparse.ArgumentParser(description="SoberMind Terminal Habit Interrupter", add_help=False)
    parser.add_argument("impulse", type=str, nargs="?", default="distracted task switch",
                        help="What automatic behavior are you about to perform?")
    parser.add_argument("--duration", type=int, default=90,
                        help="Duration of interruption in seconds (default: 90)")
    parser.add_argument("--mode", type=str, choices=["breath", "zen"], default="breath",
                        help="Somatic grounding mechanism (default: breath)")
    parser.add_argument("-h", "--help", action="store_true", help="Show this help message and exit")

    try:
        args = parser.parse_args()
    except SystemExit:
        # Fall back to printing manual if arguments were invalid
        print_help_manual()
        sys.exit(1)
    
    # Check again if options were provided but help command is still specified (e.g. sobermind --duration 10 help)
    if args.help or args.impulse.lower() in ["help", "/", "?", "commands", "-?", "/?", "/h", "/help"]:
        print_help_manual()
        sys.exit(0)
        
    if args.impulse.lower() in ["stats", "log", "logs", "history"]:
        print_stats()
        sys.exit(0)
        
    if args.impulse.lower() in ["clear", "clean", "reset"]:
        clear_stats()
        sys.exit(0)
    
    print_banner(args.impulse)
    try:
        run_timer(args.duration, args.mode)
        log_reflection(args.impulse, args.duration)
    except KeyboardInterrupt:
        print(f"\n\n{BOLD}{YELLOW}! Aborted.{RESET} Urge reset cancelled.\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
