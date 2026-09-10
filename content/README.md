# Curriculum content

Authored lessons for the DS&A curriculum. See `lib/curriculum/README.md` for the
authoring guide, directive reference, and what `npm run curriculum:check`
guarantees.

```
curriculum.yaml                  tier order and titles
datasets/<id>/dataset.yaml       shared SQL datasets
<tier>/<stage>/stage.yaml        stage metadata and lesson order
<tier>/<stage>/<lesson>/         one lesson (see the authoring guide)
```

Every SQL exercise in the curriculum uses the single `package-registry`
schema. That is deliberate: one schema learned once and reused across all
eleven stages removes the per-lesson tax of re-reading a new schema, and lets
exercises compound — the dependency graph becomes recursive CTEs in the graphs
stage, the download time series becomes window functions, and the skewed event
counts become the hashing stage's straggler problem.
