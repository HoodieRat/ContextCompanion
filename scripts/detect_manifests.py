"""Read declarative manifests only. Never import or execute target project code."""
import json
import pathlib
import re
import sys
import tomllib

root = pathlib.Path(sys.argv[1]).resolve(strict=True)
results = []
warnings = []

def record(name, ecosystem, constraint, evidence, workspace, resolved=None):
    item = dict(name=name, ecosystem=ecosystem, constraint=str(constraint),
                confidence='locked' if resolved else 'declared', evidence=evidence, workspace=workspace)
    if resolved:
        item['resolved'] = str(resolved)
    results.append(item)

for relative in sys.argv[2:]:
    try:
        target = root / relative
        if target.is_symlink() or not target.resolve(strict=True).is_relative_to(root):
            raise ValueError('path escape or symbolic link')
        with target.open('rb') as stream:
            data = tomllib.load(stream)
        workspace = str(pathlib.PurePosixPath(relative).parent)
        if target.name == 'pyproject.toml':
            reqs = data.get('project', {}).get('dependencies', [])
            for group in data.get('project', {}).get('optional-dependencies', {}).values():
                reqs += group
            for req in reqs:
                m = re.match(r'([A-Za-z0-9_.-]+)(?:\[[^\]]+\])?\s*(.*)', req)
                if m:
                    record(m[1], 'pypi', m[2] or 'unconstrained', relative, workspace)
            for name, value in data.get('tool', {}).get('poetry', {}).get('dependencies', {}).items():
                if name != 'python':
                    record(name, 'pypi', value.get('version', 'unresolved') if isinstance(value, dict) else value, relative, workspace)
        elif target.name == 'Cargo.toml':
            for field in ('dependencies', 'dev-dependencies', 'build-dependencies'):
                for name, value in data.get(field, {}).items():
                    version = value.get('version', 'workspace/path/git') if isinstance(value, dict) else value
                    record(name, 'cargo', version, relative, workspace)
        else:
            ecosystem = 'pypi' if target.name == 'uv.lock' else 'cargo'
            for pkg in data.get('package', []):
                name, version = pkg.get('name'), pkg.get('version')
                if name and version:
                    record(name, ecosystem, version, relative, workspace, version)
    except (OSError, ValueError, TypeError) as error:
        warnings.append(f'{relative}: {error}')
print(json.dumps(dict(dependencies=results, warnings=warnings)))
