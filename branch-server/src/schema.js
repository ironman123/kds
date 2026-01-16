import db from "./db.js"

export function initSchema()
{
  db.exec(`
        CREATE TABLE IF NOT EXISTS branch(
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        address TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tables (
          id TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          branchId
        );

        CREATE TABLE IF NOT EXISTS staff (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          active INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS staff_events (
          id TEXT PRIMARY KEY,
          staff_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          old_value TEXT,
          new_value TEXT,
          actor_id TEXT,
          created_at INTEGER NOT NULL
        );


        CREATE TABLE IF NOT EXISTS menu_categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          sort_order INTEGER NOT NULL,
          available INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS menu_items (
          id TEXT PRIMARY KEY,
          category_id TEXT NOT NULL,
          name TEXT NOT NULL,
          price INTEGER NOT NULL,
          available INTEGER NOT NULL DEFAULT 1,
          prep_time INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        
        CREATE TABLE IF NOT EXISTS menu_events (
          id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL,    -- CATEGORY | ITEM
          entity_id TEXT NOT NULL,
          event_type TEXT NOT NULL,     -- CREATED | UPDATED | ACTIVATED | DEACTIVATED | PRICE_CHANGED
          old_value TEXT,
          new_value TEXT,
          actor_id TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS recipes (
          id TEXT PRIMARY KEY,
          menu_item_id TEXT NOT NULL,
          instructions TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,

          CONSTRAINT fk_recipe_menu_item
            FOREIGN KEY (menu_item_id)
            REFERENCES menu_items(id)
            ON DELETE RESTRICT
            ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS recipe_ingredients (
          id TEXT PRIMARY KEY,
          recipe_id TEXT NOT NULL,
          ingredient TEXT NOT NULL,
          quantity TEXT,

          CONSTRAINT fk_ingredient_recipe
            FOREIGN KEY (recipe_id)
            REFERENCES recipes(id)
            ON DELETE RESTRICT
            ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          table_id TEXT,
          waiter_id TEXT,
          status TEXT NOT NULL,
          serve_policy TEXT NOT NULL DEFAULT 'PARTIAL',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          customer_name TEXT,
          customer_phone TEXT,
          notes TEXT
        );

        CREATE TABLE IF NOT EXISTS order_items (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'PENDING',
          menu_item_id TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          notes TEXT,
          started_at INTEGER,
          completed_at INTEGER
        );

        CREATE TABLE IF NOT EXISTS order_events (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          old_value TEXT,
          new_value TEXT,
          actor_id TEXT,
          created_at INTEGER NOT NULL
        );
        `)
}