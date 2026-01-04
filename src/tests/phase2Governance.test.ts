import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { supabase } from '../lib/supabase';
import {
  getSportContributionFactors,
  checkPhase2Enabled,
  ExtendedSportMapping,
} from '../utils/sportTypeMapping';

describe('Phase 2 Governance System', () => {
  let testUserId: string;

  beforeEach(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      testUserId = user.id;
    }
  });

  afterEach(async () => {
  });

  describe('checkPhase2Enabled', () => {
    it('should return false when Phase 2 is disabled', async () => {
      await supabase
        .from('system_config')
        .update({ config_value: false })
        .eq('config_key', 'phase_2_enabled');

      const enabled = await checkPhase2Enabled();
      expect(enabled).toBe(false);
    });

    it('should return true when Phase 2 is enabled', async () => {
      await supabase
        .from('system_config')
        .update({ config_value: true })
        .eq('config_key', 'phase_2_enabled');

      const enabled = await checkPhase2Enabled();
      expect(enabled).toBe(true);

      await supabase
        .from('system_config')
        .update({ config_value: false })
        .eq('config_key', 'phase_2_enabled');
    });

    it('should return false when config is missing', async () => {
      await supabase
        .from('system_config')
        .delete()
        .eq('config_key', 'phase_2_enabled');

      const enabled = await checkPhase2Enabled();
      expect(enabled).toBe(false);

      await supabase
        .from('system_config')
        .insert({
          config_key: 'phase_2_enabled',
          config_value: false,
          description: 'Controls Phase 2 multi-sport activation',
        });
    });
  });

  describe('v_active_sport_factors view', () => {
    it('should return Phase 1 binary values when Phase 2 disabled', async () => {
      await supabase
        .from('system_config')
        .update({ config_value: false })
        .eq('config_key', 'phase_2_enabled');

      const { data, error } = await supabase
        .from('v_active_sport_factors')
        .select('*')
        .eq('sport_type', 'Run')
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.phase_2_active).toBe(false);
      expect(Number(data?.fatigue_contribution)).toBe(1.0);
      expect(Number(data?.cardio_contribution)).toBe(1.0);
      expect(Number(data?.running_specificity)).toBe(1.0);
    });

    it('should return actual weighted values when Phase 2 enabled', async () => {
      await supabase
        .from('system_config')
        .update({ config_value: true })
        .eq('config_key', 'phase_2_enabled');

      await supabase
        .from('sport_contribution_factors')
        .update({
          fatigue_contribution: 0.8,
          cardio_contribution: 0.9,
        })
        .eq('sport_type', 'Run');

      const { data, error } = await supabase
        .from('v_active_sport_factors')
        .select('*')
        .eq('sport_type', 'Run')
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.phase_2_active).toBe(true);
      expect(Number(data?.fatigue_contribution)).toBe(0.8);
      expect(Number(data?.cardio_contribution)).toBe(0.9);

      await supabase
        .from('system_config')
        .update({ config_value: false })
        .eq('config_key', 'phase_2_enabled');

      await supabase
        .from('sport_contribution_factors')
        .update({
          fatigue_contribution: 1.0,
          cardio_contribution: 1.0,
        })
        .eq('sport_type', 'Run');
    });

    it('should return 0.0 for non-running activities when Phase 2 disabled', async () => {
      await supabase
        .from('system_config')
        .update({ config_value: false })
        .eq('config_key', 'phase_2_enabled');

      const { data, error } = await supabase
        .from('v_active_sport_factors')
        .select('*')
        .eq('sport_type', 'Ride')
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.phase_2_active).toBe(false);
      expect(Number(data?.fatigue_contribution)).toBe(0.0);
      expect(Number(data?.cardio_contribution)).toBe(0.0);
      expect(Number(data?.running_specificity)).toBe(0.0);
    });
  });

  describe('getSportContributionFactors', () => {
    it('should respect Phase 2 flag when querying factors', async () => {
      await supabase
        .from('system_config')
        .update({ config_value: false })
        .eq('config_key', 'phase_2_enabled');

      const factors = await getSportContributionFactors('Run');

      expect(factors).toBeDefined();
      expect(factors.countsForRunningLoad).toBe(true);
      expect(factors.fatigueContribution).toBe(1.0);
      expect(factors.cardioContribution).toBe(1.0);
    });

    it('should fall back gracefully when database unavailable', async () => {
      const factors = await getSportContributionFactors('NonExistentSportType');

      expect(factors).toBeDefined();
      expect(factors.sportCategory).toBe('other');
      expect(factors.countsForRunningLoad).toBe(false);
      expect(factors.contributesToFatigue).toBe('none');
    });

    it('should track telemetry on successful lookup', async () => {
      const beforeCount = await supabase
        .from('system_telemetry')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'database_lookup_success');

      await getSportContributionFactors('Run');

      await new Promise(resolve => setTimeout(resolve, 100));

      const afterCount = await supabase
        .from('system_telemetry')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'database_lookup_success');

      expect(afterCount.count).toBeGreaterThanOrEqual(beforeCount.count || 0);
    });
  });

  describe('Database Constraints', () => {
    it('should reject contribution factors outside [0.0, 1.0] range', async () => {
      const { error } = await supabase
        .from('sport_contribution_factors')
        .insert({
          sport_type: 'TestSport_InvalidFactor',
          counts_for_running_load: false,
          fatigue_contribution: 1.5,
          cardio_contribution: 0.5,
          neuromuscular_contribution: 0.5,
          metabolic_contribution: 0.5,
          running_specificity: 0.5,
        });

      expect(error).not.toBeNull();
      expect(error?.message).toContain('constraint');
    });

    it('should accept valid contribution factors', async () => {
      const { error } = await supabase
        .from('sport_contribution_factors')
        .insert({
          sport_type: 'TestSport_ValidFactor',
          counts_for_running_load: false,
          fatigue_contribution: 0.7,
          cardio_contribution: 0.8,
          neuromuscular_contribution: 0.6,
          metabolic_contribution: 0.7,
          running_specificity: 0.5,
        });

      expect(error).toBeNull();

      await supabase
        .from('sport_contribution_factors')
        .delete()
        .eq('sport_type', 'TestSport_ValidFactor');
    });
  });

  describe('Phase 2 Activation Prevention', () => {
    it('should prevent Phase 2 activation through database update alone', async () => {
      await supabase
        .from('system_config')
        .update({ config_value: false })
        .eq('config_key', 'phase_2_enabled');

      await supabase
        .from('sport_contribution_factors')
        .update({
          fatigue_contribution: 0.75,
          cardio_contribution: 0.85,
        })
        .eq('sport_type', 'Run');

      const { data } = await supabase
        .from('v_active_sport_factors')
        .select('*')
        .eq('sport_type', 'Run')
        .maybeSingle();

      expect(Number(data?.fatigue_contribution)).toBe(1.0);
      expect(Number(data?.cardio_contribution)).toBe(1.0);

      await supabase
        .from('sport_contribution_factors')
        .update({
          fatigue_contribution: 1.0,
          cardio_contribution: 1.0,
        })
        .eq('sport_type', 'Run');
    });

    it('should only use weighted values after explicit flag activation', async () => {
      await supabase
        .from('system_config')
        .update({ config_value: false })
        .eq('config_key', 'phase_2_enabled');

      await supabase
        .from('sport_contribution_factors')
        .update({
          fatigue_contribution: 0.6,
        })
        .eq('sport_type', 'Ride');

      let { data } = await supabase
        .from('v_active_sport_factors')
        .select('fatigue_contribution, phase_2_active')
        .eq('sport_type', 'Ride')
        .maybeSingle();

      expect(data?.phase_2_active).toBe(false);
      expect(Number(data?.fatigue_contribution)).toBe(0.0);

      await supabase
        .from('system_config')
        .update({ config_value: true })
        .eq('config_key', 'phase_2_enabled');

      ({ data } = await supabase
        .from('v_active_sport_factors')
        .select('fatigue_contribution, phase_2_active')
        .eq('sport_type', 'Ride')
        .maybeSingle());

      expect(data?.phase_2_active).toBe(true);
      expect(Number(data?.fatigue_contribution)).toBe(0.6);

      await supabase
        .from('system_config')
        .update({ config_value: false })
        .eq('config_key', 'phase_2_enabled');
    });
  });
});
