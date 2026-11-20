// den-rats, "A Whole Hot Slice" (Slice Run). Sue wants a whole slice, hot,
// down the stairs. Star turn: Express conducts the slapstick relay down the steps.
import { L, mechaLine, beside } from './_ssf-common.js';

export function installDenRats(G) {
  const E = G.schemes;
  E.registerScript('rats.meet', (ctx, done) => G.say([
    L('sue', 'Subway Sue. I run the grates. Seven of \'em, and every train under this park.'),
    L('sue', 'Want a ticket? A whole slice from that $1 SLICE joint over there. HOT. Down the stairs.'),
    L('crumbsy', 'And the crust. Don\'t forget the crust. The crust is the best part.'),
  ], done));
  G.bus.on('pickup', (t, e) => {
    if (e.item !== 'slice' || G.state.flags['card.sliceCold']) return;
    G.state.flags['card.sliceCold'] = true;
    G.toast('Slices go cold. Some folks care.', { kind: 'stamp', seconds: 4 });
  });
  E.registerScript('rats.join', (ctx, done) => {
    const sue = G.chars.find('sue'), ex = G.chars.find('express');
    const g = G.gus.position;
    const relay = [];
    G.cutscene.run('rats-relay', [
      { do: () => {
        if (ex) { const p = beside(G, Math.PI * 0.6, 1.3); ex.here = { x: p.x, z: p.z, scripted: true }; ex.script = true; G.chars.arrive(ex, p, 'grate', 1.2); }
        // the slice goes down the steps from paw to paw
        const sl = G.items.makeMesh('slice'); sl.position.set(sue?.x ?? g.x, (sue?.y ?? g.y) + 0.15, sue?.z ?? g.z); G.items.group.add(sl); relay.push(sl);
      } },
      { cam: { ...G.shot({ x: g.x, y: g.y, z: g.z }, { dist: 3.6, height: 1.2, yaw: G.gus.yaw + Math.PI + 0.5, lookY: 0.2 }), secs: 0.8 } },
      { say: [L('express', 'ALL ABOARD! One hot slice, express service! Mind the gap, mind the\u00a0cheese!')] },   // Polish-1: a no-break space (same length, same timing) so "cheese!" never wraps alone
      { do: () => { G.audio.play('rat-squeak', { at: g }); G.audio.play('subway-rumble', { at: g, vol: 0.5 }); } },
      ...[0, 1, 2, 3, 4].map((k) => ({ do: () => { const s = relay[0]; if (s) { s.position.y -= 0.18; s.position.x += 0.12; s.rotation.z = k * 0.9; } G.audio.play('rat-squeak', { at: g, rate: 1 + k * 0.08 }); G.particles.burst('crumbs', s?.position.x ?? g.x, (s?.position.y ?? g.y) + 0.1, s?.position.z ?? g.z, 4); }, wait: 0.35 })),
      { do: () => { for (const s of relay) s.removeFromParent(); } },
      { say: [
        L('sue', '…Hot. All the way down. You know how rare that is?'),
        L('pinstripe', 'A rat in a tie notices these things. Welcome to the network, Gus.'),
        L('sue', 'The Grate Rats are yours. Any grate, any time. And my boys\'ll bring slices to Merchants\' Gate.', 'sue-join'),
      ] },
      { follow: true },
      { do: () => { if (ex) G.chars.goHome(ex); done(); } },
    ], null, () => { for (const s of relay) s.removeFromParent(); relay.length = 0; });   // Fixes-3 (B2): dropped mid-relay, no slice left hanging by Sue
  });
  mechaLine(G, 'sue', 'rats', 'A pigeon the size of a subway car? Express wants to know if it takes the A train.');
}
