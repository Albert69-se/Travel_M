/**
 * Packing checklist for one trip.
 *
 * Every item is a single traveller-authored record, so the screen stays a dense
 * editable list: tick, rename in place, remove with a second confirming step.
 * Drafting the standard list is an explicit action, never an automatic one.
 */
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Backpack, Check, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';

import {
  Button,
  Card,
  CardHeader,
  Checkbox,
  Divider,
  EmptyState,
  IconButton,
  KeyValue,
  Notice,
  ProgressBar,
  Row,
  TextInput,
} from '../components/ui.jsx';
import { useData } from '../lib/store.jsx';
import { describeSuggestionSource } from '../../core/packing.js';

function PackingRow({ item, onToggle, onRename, onDelete }) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(item.name);
  const [confirming, setConfirming] = useState(false);

  const commitRename = () => {
    const next = draft.trim();
    if (next) {
      if (next !== item.name) onRename(item.id, next);
    } else {
      setDraft(item.name);
    }
    setRenaming(false);
  };

  return (
    <Row className="gap-2.5">
      <Checkbox
        checked={item.isPacked === true}
        onChange={() => onToggle(item.id)}
        aria-label={item.isPacked ? `Mark ${item.name} as not packed` : `Mark ${item.name} as packed`}
      />
      <div className="min-w-0 flex-1">
        {renaming ? (
          <TextInput
            aria-label={`Rename ${item.name}`}
            value={draft}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitRename();
              }
              if (event.key === 'Escape') {
                setDraft(item.name);
                setRenaming(false);
              }
            }}
            onBlur={commitRename}
          />
        ) : (
          <span
            className={`block truncate text-body ${item.isPacked ? 'text-ink-tertiary line-through' : 'text-ink'}`}
          >
            {item.name}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {renaming ? (
          <Button size="sm" variant="secondary" icon={Check} onClick={commitRename}>
            Save
          </Button>
        ) : (
          <IconButton
            icon={Pencil}
            label={`Rename ${item.name}`}
            onClick={() => {
              setDraft(item.name);
              setRenaming(true);
            }}
          />
        )}
        {confirming ? (
          <>
            <Button size="sm" variant="danger" onClick={() => onDelete(item.id)}>
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <IconButton icon={Trash2} label={`Delete ${item.name}`} onClick={() => setConfirming(true)} />
        )}
      </div>
    </Row>
  );
}

export default function PackingView() {
  const { trip, packing, packingCounts } = useOutletContext();
  const { addPackingItem, togglePackingItem, renamePackingItem, deletePackingItem, suggestPackingItems } = useData();

  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState('');

  // Unpacked items first; equal keys keep the stored order.
  const ordered = [...packing].sort((a, b) => Number(a.isPacked === true) - Number(b.isPacked === true));
  const complete = packingCounts.total > 0 && packingCounts.packed === packingCounts.total;

  const handleAdd = (event) => {
    event.preventDefault();
    const result = addPackingItem(trip.id, newName);
    if (!result.ok) {
      setNameError((result.errors && result.errors.name) || 'Enter an item name.');
      return;
    }
    setNewName('');
    setNameError('');
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title font-semibold text-ink">Packing</h1>
          <p className="mt-0.5 text-body text-ink-secondary tm-numeric">
            Packed {packingCounts.packed} of {packingCounts.total}
          </p>
        </div>
        <Button variant="secondary" icon={Sparkles} onClick={() => suggestPackingItems(trip.id)}>
          Suggest a standard list
        </Button>
      </header>

      <ProgressBar
        value={packingCounts.packed}
        max={packingCounts.total}
        tone={complete ? 'success' : 'accent'}
        label="Packing progress"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card padded={false} className="overflow-hidden">
          <div className="p-4">
            <CardHeader
              title="Checklist"
              meta={`${packingCounts.total} ${packingCounts.total === 1 ? 'item' : 'items'} · ${
                packingCounts.remaining
              } still to pack`}
            />
          </div>
          <Divider />
          {ordered.length === 0 ? (
            <EmptyState
              icon={Backpack}
              title="Nothing on this list yet"
              description="Add the first item below, or draft the standard suggestion list."
              action={
                <Button variant="secondary" icon={Sparkles} onClick={() => suggestPackingItems(trip.id)}>
                  Suggest a standard list
                </Button>
              }
            />
          ) : (
            <div className="tm-scroll max-h-[560px] overflow-y-auto">
              {ordered.map((item) => (
                <PackingRow
                  key={item.id}
                  item={item}
                  onToggle={togglePackingItem}
                  onRename={renamePackingItem}
                  onDelete={deletePackingItem}
                />
              ))}
            </div>
          )}

          <form
            onSubmit={handleAdd}
            className="flex items-start gap-2 border-t border-dashed border-line-strong px-3 py-2.5"
          >
            <Plus
              size={15}
              strokeWidth={1.75}
              aria-hidden="true"
              className="mt-2.5 shrink-0 text-ink-tertiary"
            />
            <div className="min-w-0 flex-1">
              <TextInput
                id="packing-new-item"
                aria-label="Add a packing item"
                className="border-dashed"
                placeholder="Add item"
                value={newName}
                onChange={(event) => {
                  setNewName(event.target.value);
                  if (nameError) setNameError('');
                }}
              />
              {nameError ? (
                <p className="mt-1 text-label text-danger" role="alert">
                  {nameError}
                </p>
              ) : null}
            </div>
            <Button type="submit" variant="secondary">
              Add item
            </Button>
          </form>
        </Card>

        <Card className="flex flex-col gap-3">
          <CardHeader title="At a glance" meta={`Progress for ${trip.name}`} />
          <div className="flex flex-col">
            <KeyValue label="Packed">{`${packingCounts.packed} of ${packingCounts.total}`}</KeyValue>
            <KeyValue label="Still to pack">{String(packingCounts.remaining)}</KeyValue>
          </div>
          <Notice tone="info" icon={Sparkles}>
            {describeSuggestionSource(false)}
          </Notice>
        </Card>
      </div>
    </div>
  );
}
