# Tactics UI research notes

Source: https://www.footballmanager.com/fm26/features/possession-out-possession-fm26s-new-tactical-evolution

The official FM26 article describes separate In Possession and Out of Possession formations, plus four tactical views: In Possession, Out of Possession, Both, and Combined. The Both view compares the two shapes side by side; Combined represents average player positions and applies personnel changes across both individual formations. The article also describes a Team Instructions Visualiser divided into nine selectable pitch zones, with separate In Possession and Out of Possession views. Selecting a zone reveals how roles and positioning change as the ball moves through the thirds. It emphasizes role suitability, positional familiarity, and clear tactical risk feedback.

Source: https://cdn.footballmanager.com/site/inline-images/Screenshot%202026-01-08%20135937.png

The official Team Shape reference uses a dark tactical workspace with a large pitch on the left and a dense player-role table on the right. The table includes IP role, OOP role, ability, player, position, condition/status, and match-performance indicators. The screen also keeps formation, style, mentality, familiarity, intensity, advice, undo, and quick-pick actions close to the tactical workspace.

Source: https://cdn.footballmanager.com/site/inline-images/Screenshot%202026-01-08%20141024_0.png

The official Team Instructions reference uses a substantial tactical visualiser on the left, contextual instruction controls in the centre, and an overview/report area on the right. Controls are grouped by tactical context instead of presented as one long list. The overview summarizes active instructions and team context without simply duplicating the centre controls.

Implementation implication: preserve the existing game's green/charcoal identity and real tactical state, while making the pitch, phase selector, player assignments, contextual controls, and tactical overview read as one professional workstation. Avoid decorative controls, unsupported fake data, gradients, glass effects, and cramped or tiny pitch areas.
