# A Workspace owns all user data

Everything a person creates in gaus (Trades, Follows, Stages, Dismissals) belongs to a Workspace, never directly to a User, and is isolated per Workspace by row-level security. Today each sign-up creates one Workspace with one User, and there is no sharing, so owning the data by User would be simpler. We keep the Workspace boundary anyway, carried over from the old repo's ADR-0003, because adding it later means reworking the schema and every query, which is expensive and error-prone.
