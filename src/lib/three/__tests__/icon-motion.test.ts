import { describe, expect, it } from 'vitest';
import { iconPose, MOTION_MS, type IconMotion } from '../icon-motion';

const ONE_SHOT = (Object.keys(MOTION_MS) as IconMotion[]).filter((m) => m !== 'tick');
const wrap = (a: number) => Math.abs(Math.sin(a / 2)); // 0 untuk kelipatan 2π

describe('iconPose', () => {
  it.each(ONE_SHOT)('%s mulai dan berakhir di pose diam', (m) => {
    for (const p of [0, 1]) {
      const pose = iconPose(m, p);
      expect(pose.y).toBeCloseTo(0, 5);
      expect(pose.rx).toBeCloseTo(0, 5);
      expect(wrap(pose.ry)).toBeCloseTo(0, 5);
      expect(pose.rz).toBeCloseTo(0, 5);
      expect(pose.sy).toBeCloseTo(1, 5);
      expect(pose.glow).toBeCloseTo(0, 5);
      for (const s of Object.values(pose.partScale)) expect(s).toBeCloseTo(1, 5);
    }
  });

  it('tick melanjutkan jarum seperempat putaran per ketukan', () => {
    expect(iconPose('tick', 1, 0).partRz[1]).toBeCloseTo(-Math.PI / 2, 5);
    expect(iconPose('tick', 1, 3).partRz[1]).toBeCloseTo(-2 * Math.PI, 5);
  });
});
