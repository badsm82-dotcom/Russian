import { describe, expect, it } from 'vitest';
import { selectBridges, bridgeEffectReport, defaultLanguageProfile, type LanguageBridge, type KnownLanguage } from '../src/index.js';

const b = (over: Partial<LanguageBridge>): LanguageBridge => ({
  id: 'b', concept_id: 'lex:chai', source_language: 'pt', source_expression: 'chá', russian_expression: 'чай',
  bridge_type: 'lexical_cognate', elementary: true, explanation_fr: '', limitations_fr: '', validation_status: 'validated',
  source_reference: 'test', version: 1, ...over,
});
const langs = defaultLanguageProfile().known_languages;

describe('Passerelles (§2.2–2.3, F14)', () => {
  it('n’affiche jamais une analogie non validée', () => {
    const sel = selectBridges('lex:chai', [b({ validation_status: 'draft' }), b({ id: 'p', validation_status: 'pending_review' })], langs);
    expect(sel.default).toBeNull();
  });
  it('notion sans passerelle : rien', () => {
    expect(selectBridges('lex:none', [b({})], langs)).toEqual({ default: null, alternatives: [] });
  });
  it('langue désactivée jamais proposée', () => {
    const off: KnownLanguage[] = langs.map((l) => (l.code === 'pt' ? { ...l, bridges_enabled: false } : l));
    expect(selectBridges('lex:chai', [b({})], off).default).toBeNull();
  });
  it('langues non courantes seulement pour une analogie élémentaire ; priorité aux courantes', () => {
    const ro = b({ id: 'ro', source_language: 'ro', elementary: false });
    expect(selectBridges('lex:chai', [ro], langs).default).toBeNull();
    const sel = selectBridges('lex:chai', [b({ id: 'it', source_language: 'it' }), b({ id: 'pt' })], langs);
    expect(sel.default?.id).toBe('pt');
    expect(sel.alternatives.map((x) => x.id)).toEqual(['it']);
  });
  it('désactivation globale', () => {
    expect(selectBridges('lex:chai', [b({})], langs, { enabled: false }).default).toBeNull();
  });
  it('le retour de l’apprenant ajuste progressivement l’ordre', () => {
    const cat = [b({ id: 'a', source_language: 'de' }), b({ id: 'z', source_language: 'en' })];
    expect(selectBridges('lex:chai', cat, langs).default?.id).toBe('a');
    const fb = [{ bridge_id: 'a', helpful: 0, not_helpful: 6 }, { bridge_id: 'z', helpful: 5, not_helpful: 0 }];
    expect(selectBridges('lex:chai', cat, langs, { enabled: true, feedback: fb }).default?.id).toBe('z');
  });
  it('rapport d’effet : données insuffisantes sur quelques essais', () => {
    const r = bridgeEffectReport([{ with_bridge: true, recall_d1: true, recall_d7: null }]);
    expect(r.sufficient_data).toBe(false);
    expect(r.note_fr).toMatch(/insuffisantes/);
  });
});
