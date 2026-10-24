# Data notice

## Scento Perfume Database

Most entries in `imported/` and all note descriptions in `notes/` are derived from the
**Scento Perfume Database**, © Scento, licensed under
[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

- Source: https://www.scento.com/perfume-database
- Dataset: https://github.com/Scento-com/perfume-dataset
- Snapshot used: see `imported/_scento-snapshot.json`

Changes made by Sillage: fields were renamed and mapped onto Sillage's data model
(families, vibes and times of day were translated to Sillage's categories); duplicates of
hand-written entries were removed; occasions, weather and strength ratings were
**estimated** from the source data and are marked as `estimated` on each entry. Scento
does not endorse Sillage.
