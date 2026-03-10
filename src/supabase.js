import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://plfiwplptauvjbcyxxoh.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hoU4vmG-yJnXcJiPD3YsMg_uacSnT_d'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)