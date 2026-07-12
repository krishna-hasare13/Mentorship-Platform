
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function addColumn() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        
        // Add the columns if they don't exist
        const sql = `
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='sessions' AND column_name='waiting_room_enabled') THEN
                    ALTER TABLE sessions ADD COLUMN waiting_room_enabled BOOLEAN DEFAULT FALSE;
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='sessions' AND column_name='max_participants') THEN
                    ALTER TABLE sessions ADD COLUMN max_participants INTEGER;
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='sessions' AND column_name='scheduled_at') THEN
                    ALTER TABLE sessions ADD COLUMN scheduled_at TIMESTAMPTZ;
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='session_participants' AND column_name='status') THEN
                    ALTER TABLE session_participants ADD COLUMN status TEXT DEFAULT 'joined';
                END IF;
            END $$;
        `;
        
        await client.query(sql);
        console.log('Successfully added or verified existence of session columns.');
        
    } catch (err) {
        console.error('Error adding column:', err);
    } finally {
        await client.end();
    }
}

addColumn();
