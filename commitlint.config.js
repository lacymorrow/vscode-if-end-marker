module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation only changes
        'style',    // Changes that don't affect code meaning
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf',     // Performance improvement
        'test',     // Adding missing tests
        'chore',    // Changes to build process or auxiliary tools
        'revert',   // Reverts a previous commit
        'ci'        // CI configuration changes
      ]
    ]
  }
};