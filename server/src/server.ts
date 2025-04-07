import { app, PORT } from './app';
import { getDatabase } from './database/connection';

// Initialize database connection
const db = getDatabase();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
