# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server (http://localhost:5173/)
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build

### Environment Setup
- Set `GEMINI_API_KEY` in `.env.local` (currently using placeholder value)

## Application Architecture

### Route Structure
This is a React SPA with two main user interfaces separated by authentication:

- **`/search`** (default) - Public seller search interface where users can look up meeting schedules
- **`/admin`** - Protected admin interface requiring password authentication (default: "admin123")

### Authentication System
- Uses React Context (`AuthContext`) for state management
- Session-based authentication stored in `sessionStorage`
- `ProtectedRoute` component wraps admin routes
- Simple password-based authentication (configurable in `AuthContext.tsx`)

### Core Data Flow
1. **State Management**: Each route maintains its own state copies of buyers, sellers, sessions, and schedules
2. **Schedule Generation**: Sessions are dynamically calculated based on `SessionSettings` (duration, break time, start times)
3. **Auto-scheduling Algorithm**: Uses preferences (6 primary + 4 backup sellers per buyer) with randomization and conflict avoidance
4. **Data Persistence**: Currently in-memory only; data resets on page refresh

### Key Components Architecture

**App.tsx**: Root routing component with `BrowserRouter` and `AuthProvider`

**AdminPanel.tsx**: Full admin interface container with state management identical to the original App.tsx logic

**UserSearchPage.tsx**: Public search interface container with read-only state management

**AdminView.tsx**: Complex admin interface with:
- Buyer/seller management with modals
- Drag-and-drop schedule editing
- Session conflict detection
- Undo/redo functionality
- CSV import/export

**SellerView.tsx**: Search interface with autocomplete and meeting cards

### Data Models
- **Buyer**: ID, name, country, sessionBlock (morning/afternoon)
- **Seller**: ID, name  
- **Session**: ID, name, startTime, endTime, block
- **Schedule**: Nested object `buyerId -> sessionId -> sellerId | null`
- **BuyerPreferredSellers**: `buyerId -> sellerId[]` (10 total: 6 primary + 4 backup)

### Business Logic
- **Session Calculation**: Dynamic generation based on start times, duration, and break intervals
- **Auto-scheduling**: Randomized assignment prioritizing primary preferences, avoiding conflicts
- **Conflict Detection**: Prevents same seller from being assigned to multiple buyers in the same session
- **Validation**: Max 20 buyers per block, max 2 countries per block, unique seller preferences

### State Management Pattern
Both `AdminPanel` and `UserSearchPage` duplicate the same state management logic from the original App.tsx. This creates data consistency challenges but isolates the two interfaces completely.

### Configuration
- **Constants**: Defined in `constants.ts` including max buyers, preference counts, initial settings
- **Password**: Hardcoded in `AuthContext.tsx` as "admin123"
- **Session Settings**: Configurable via admin interface (duration, breaks, start times, session count)

## Important Notes

- The application currently has no backend - all data is ephemeral
- Both admin and search interfaces maintain separate state copies
- The Gemini API key is configured but not currently used in the meeting scheduler logic
- Session conflicts are detected and highlighted but not automatically resolved
- CSV import/export functionality is available for seller data