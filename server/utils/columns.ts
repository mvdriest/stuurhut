// Supabase/PostgREST select-alias strings, mapping each table's snake_case
// columns to the camelCase shape the frontend composables expect.

export const TRAJECTEN_SELECT = 'id, userId:user_id, naam, status, eerstvolgendeActie:eerstvolgende_actie, kleur, doelId:doel_id, createdAt:created_at, updatedAt:updated_at, scope, wachtOp:wacht_op, streefdatum, bedragAfgesproken:bedrag_afgesproken, bedragGefactureerd:bedrag_gefactureerd, financieelNotitie:financieel_notitie, contactpersoon, contactTelefoon:contact_telefoon, contactEmail:contact_email, contactVoorkeur:contact_voorkeur'

export const VANDAAG_SELECT = 'id, userId:user_id, tekst, klaar, datum, volgorde, createdAt:created_at'

export const INBOX_SELECT = 'id, userId:user_id, tekst, createdAt:created_at'

export const DAGBLOKKEN_SELECT = 'id, userId:user_id, weekdag, type, startTijd:start_tijd, eindTijd:eind_tijd, volgorde, createdAt:created_at'

export const SUBTAKEN_SELECT = 'id, userId:user_id, trajectId:traject_id, tekst, geschatteDuur:geschatte_duur, status, volgorde, createdAt:created_at'

export const GEPLANDE_TAKEN_SELECT = 'id, userId:user_id, subtaakId:subtaak_id, vrijeTekst:vrije_tekst, datum, blokType:blok_type, startTijd:start_tijd, geschatteDuur:geschatte_duur, status, volgorde, createdAt:created_at, updatedAt:updated_at'

export const TIJDSCHATTING_CORRECTIES_SELECT = 'id, userId:user_id, omschrijving, geschatteDuur:geschatte_duur, aangepasteDuur:aangepaste_duur, context, createdAt:created_at'

export const IDEEEN_SELECT = 'id, userId:user_id, trajectId:traject_id, titel, inhoud, createdAt:created_at, updatedAt:updated_at'

export const FOCUS_SESSIES_SELECT = 'id, userId:user_id, trajectId:traject_id, subtaakId:subtaak_id, type, duurMinuten:duur_minuten, voltooid, createdAt:created_at'

export const DOELEN_SELECT = 'id, userId:user_id, titel, omschrijving, deadline, status, volgorde, createdAt:created_at, updatedAt:updated_at'

export const DOEL_MIJLPALEN_SELECT = 'id, userId:user_id, doelId:doel_id, titel, beloning, afgerond, volgorde, createdAt:created_at, updatedAt:updated_at'

export const JOURNAL_SELECT = 'id, userId:user_id, inhoud, bron, createdAt:created_at, trajectId:traject_id, resultaatLabel:resultaat_label'

export const TRAJECT_BESTANDEN_SELECT = 'id, userId:user_id, trajectId:traject_id, kind, naam, url, createdAt:created_at'

export const AFSPRAKEN_SELECT = 'id, userId:user_id, titel, categorie, trajectId:traject_id, datum, startTijd:start_tijd, eindTijd:eind_tijd, createdAt:created_at'
