import React, { useEffect, useMemo, useState } from 'react';
import SyllabusTracking from './SyllabusTracking';
import {
  Alert, Button, Card, Divider, Input, InputNumber, List, Select,
  Space, Switch, Tooltip, message, Typography, Popconfirm
} from 'antd';
import { supabase } from '../config/supabaseClient';

const { Title, Text } = Typography;

function byText(field) {
  return (a, b) => String(a[field]).localeCompare(String(b[field]));
}

const STATUS_ORDER = ['pending', 'in_progress', 'completed'];
const STATUS_LABEL = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};
const STATUS_COLOR = {
  pending: '#d9d9d9',       // grey
  in_progress: '#faad14',   // yellow
  completed: '#52c41a',     // green
};

export default function SyllabusPage() {
  // Query params
  const params = new URLSearchParams(window.location.search);
  const qpSubjectId = params.get('subjectId');
  const qpClassInstanceId = params.get('classInstanceId');

  // State
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);

  const [subjects, setSubjects] = useState([]);
  const [classInstances, setClassInstances] = useState([]);
  const [subjectId, setSubjectId] = useState(qpSubjectId);
  const [classInstanceId, setClassInstanceId] = useState(qpClassInstanceId);

  const [syllabus, setSyllabus] = useState(null);
  const [chapters, setChapters] = useState([]); // [{id?, unit_no, title, status}]

  const canEdit = me?.role === 'admin' || me?.role === 'superadmin';

  // bootstrap
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) {
          setError('Not signed in.');
          setLoading(false);
          return;
        }
        const { data: meRow, error: meErr } = await supabase
          .from('users')
          .select('id, role, school_code')
          .eq('id', auth.user.id)
          .single();
        if (meErr || !meRow) throw meErr ?? new Error('User profile not found');
        setMe(meRow);

        const [{ data: subs, error: subErr }, { data: cis, error: ciErr }] = await Promise.all([
          supabase.from('subjects').select('id, subject_name').order('subject_name'),
          supabase.from('class_instances').select('id, grade, section').order('grade').order('section'),
        ]);
        if (subErr) throw subErr;
        if (ciErr) throw ciErr;
        setSubjects(subs ?? []);
        setClassInstances(cis ?? []);
      } catch (e) {
        setError(e?.message || 'Failed to initialize');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // load syllabus when filters set
  useEffect(() => {
    if (!subjectId || !classInstanceId) {
      setSyllabus(null);
      setChapters([]);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: syl, error: sylErr } = await supabase
          .from('syllabi')
          .select('id, school_code, class_instance_id, subject_id, title, description, is_published')
          .eq('subject_id', subjectId)
          .eq('class_instance_id', classInstanceId)
          .maybeSingle();
        if (sylErr) throw sylErr;
        if (!syl) {
          setSyllabus(null);
          setChapters([]);
          return;
        }
        setSyllabus(syl);

        const { data: its, error: itErr } = await supabase
          .from('syllabus_items')
          .select('id, syllabus_id, unit_no, title, status')
          .eq('syllabus_id', syl.id)
          .order('unit_no', { ascending: true })
          .order('title', { ascending: true });
        if (itErr) throw itErr;
        setChapters(its ?? []);
      } catch (e) {
        setError(e?.message || 'Failed to load syllabus');
      } finally {
        setLoading(false);
      }
    })();
  }, [subjectId, classInstanceId]);

  const subjectOptions = useMemo(
    () => (subjects || []).map((s) => ({ label: s.subject_name, value: s.id })).sort(byText('label')),
    [subjects]
  );
  const classInstanceOptions = useMemo(
    () =>
      (classInstances || [])
        .map((c) => ({ label: `Grade ${c.grade ?? ''}${c.section ? '-' + c.section : ''}`, value: c.id }))
        .sort(byText('label')),
    [classInstances]
  );

  // Status helpers
  const nextStatus = (s) => {
    const i = STATUS_ORDER.indexOf(s);
    return STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
  };

  const updateChapterStatus = async (idx, newStatus) => {
    const ch = chapters[idx];
    if (!ch?.id) {
      message.info('Save draft to enable status updates.');
      return;
    }
    // optimistic update
    const prev = ch.status;
    const next = chapters.slice();
    next[idx] = { ...ch, status: newStatus };
    setChapters(next);
    try {
      const { error } = await supabase
        .from('syllabus_items')
        .update({ status: newStatus })
        .eq('id', ch.id);
      if (error) throw error;
      message.success(`Status: ${STATUS_LABEL[newStatus]}`);
    } catch (e) {
      // revert on error
      const rev = chapters.slice();
      rev[idx] = { ...ch, status: prev };
      setChapters(rev);
      message.error(e?.message || 'Failed to update status');
    }
  };

  // actions
  const createSyllabus = async () => {
    if (!me || !subjectId || !classInstanceId) return;
    try {
      setSaving(true);
      const payload = {
        school_code: me.school_code,
        class_instance_id: classInstanceId,
        subject_id: subjectId,
        title: null,
        description: null,
        created_by: me.id,
      };
      const { data, error: insErr } = await supabase.from('syllabi').insert(payload).select().single();
      if (insErr) {
        if (insErr.code === '23505') {
          message.info('Syllabus already exists. Loading it.');
          const { data: exists } = await supabase
            .from('syllabi')
            .select('id, school_code, class_instance_id, subject_id, title, description, is_published')
            .eq('subject_id', subjectId)
            .eq('class_instance_id', classInstanceId)
            .single();
          setSyllabus(exists);
          return;
        }
        throw insErr;
      }
      setSyllabus(data);
      message.success('Syllabus created.');
    } catch (e) {
      message.error(e?.message || 'Failed to create syllabus');
    } finally {
      setSaving(false);
    }
  };

  const addChapter = () => {
    if (!syllabus) return;
    const nextUnit = (chapters.reduce((m, it) => Math.max(m, it.unit_no), 0) || 0) + 1;
    setChapters([...chapters, { unit_no: nextUnit, title: '', status: 'pending' }]); // default Pending
  };

  const removeChapter = (idx) => {
    const next = chapters.slice();
    next.splice(idx, 1);
    setChapters(next);
  };

  const saveDraft = async () => {
    if (!me || !syllabus?.id) {
      message.error('Create syllabus first');
      return;
    }
    try {
      setSaving(true);
      setError(null);

      const bad = chapters.find((ch) => !ch.title || ch.unit_no < 1);
      if (bad) {
        message.warning('Each chapter needs a Name and Chapter number >= 1.');
        return;
      }

      // Fetch current DB rows to compute deltas
      const { data: existing } = await supabase
        .from('syllabus_items')
        .select('id')
        .eq('syllabus_id', syllabus.id);

      const existingIds = new Set((existing ?? []).map((x) => x.id));
      const currentIds = new Set(chapters.filter((x) => x.id).map((x) => x.id));
      const toDelete = Array.from(existingIds).filter((id) => !currentIds.has(id));

      const toInsert = chapters
        .filter((x) => !x.id)
        .map((x) => ({
          syllabus_id: syllabus.id,
          unit_no: x.unit_no,
          title: x.title,
          status: x.status || 'pending',
          created_by: me.id,
        }));

      // include syllabus_id + created_by so upsert insert-path is safe
      const toUpdate = chapters
        .filter((x) => x.id)
        .map((x) => ({
          id: x.id,
          syllabus_id: syllabus.id,
          unit_no: x.unit_no,
          title: x.title,
          status: x.status || 'pending',
          created_by: me.id,
        }));

      if (toInsert.length) {
        const { error: insErr } = await supabase.from('syllabus_items').insert(toInsert);
        if (insErr) throw insErr;
      }
      if (toUpdate.length) {
        const { error: updErr } = await supabase
          .from('syllabus_items')
          .upsert(toUpdate, { onConflict: 'id' });
        if (updErr) throw updErr;
      }
      if (toDelete.length) {
        const { error: delErr } = await supabase.from('syllabus_items').delete().in('id', toDelete);
        if (delErr) throw delErr;
      }

      message.success('Draft saved.');
      // Reload
      const { data: its, error: itErr } = await supabase
        .from('syllabus_items')
        .select('id, syllabus_id, unit_no, title, status')
        .eq('syllabus_id', syllabus.id)
        .order('unit_no', { ascending: true })
        .order('title', { ascending: true });
      if (itErr) throw itErr;
      setChapters(its ?? []);
    } catch (e) {
      const code = e?.code || e?.details;
      if (code === '23505') {
        message.error('Duplicate chapter (same number & name). Adjust and retry.');
      } else {
        message.error(e?.message || 'Failed to save draft');
      }
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const setPublished = async (val) => {
    if (!syllabus) return;
    try {
      setPublishing(true);
      const { error } = await supabase.from('syllabi').update({ is_published: val }).eq('id', syllabus.id);
      if (error) throw error;
      setSyllabus({ ...syllabus, is_published: val });
      message.success(val ? 'Published' : 'Unpublished');
    } catch (e) {
      message.error(e?.message || 'Failed to update publish state');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Card loading={loading} title={<Title level={4}>Syllabus</Title>}>
      {error && <Alert type="error" message="Error" description={error} style={{ marginBottom: 16 }} showIcon />}

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Filters */}
        <Space wrap>
          <div style={{ minWidth: 260 }}>
            <Text strong>Subject</Text>
            <Select
              showSearch
              placeholder="Select subject"
              style={{ width: 300 }}
              value={subjectId || undefined}
              onChange={(v) => setSubjectId(v)}
              options={(subjects || []).map((s) => ({ label: s.subject_name, value: s.id })).sort(byText('label'))}
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>
          <div style={{ minWidth: 260 }}>
            <Text strong>Class Instance</Text>
            <Select
              showSearch
              placeholder="Select class instance"
              style={{ width: 300 }}
              value={classInstanceId || undefined}
              onChange={(v) => setClassInstanceId(v)}
              options={(classInstances || [])
                .map((c) => ({ label: `Grade ${c.grade ?? ''}${c.section ? '-' + c.section : ''}`, value: c.id }))
                .sort(byText('label'))}
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>

          {syllabus ? (
            <Space>
              <Tooltip title="Published syllabi are read-only for non-admins.">
                <span>
                  <Switch
                    loading={publishing}
                    checked={!!syllabus.is_published}
                    onChange={(val) => setPublished(val)}
                    disabled={!canEdit}
                  />
                  <Text style={{ marginLeft: 8 }}>{syllabus.is_published ? 'Published' : 'Draft'}</Text>
                </span>
              </Tooltip>
            </Space>
          ) : (
            <Button type="primary" onClick={createSyllabus} disabled={!canEdit || !subjectId || !classInstanceId}>
              Create Syllabus
            </Button>
          )}
        </Space>

        {syllabus && (
          <>
            <Divider />
            <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
              <Title level={5} style={{ margin: 0 }}>Chapters</Title>
              <Space>
                <Button onClick={addChapter} disabled={!canEdit}>Add Chapter</Button>
                <Button type="primary" onClick={saveDraft} loading={saving} disabled={!canEdit}>Save Draft</Button>
              </Space>
            </Space>

            {chapters.length === 0 ? (
              <Alert type="info" message="No chapters yet. Click 'Add Chapter' to start." />
            ) : (
              <List
                dataSource={chapters}
                renderItem={(ch, idx) => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        key="del"
                        title="Remove this chapter?"
                        onConfirm={() => removeChapter(idx)}
                        okButtonProps={{ danger: true }}
                        disabled={!canEdit}
                      >
                        <Button danger size="small" disabled={!canEdit}>Delete</Button>
                      </Popconfirm>,
                    ]}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space wrap align="center">
                        <InputNumber
                          min={1}
                          value={ch.unit_no}
                          onChange={(v) => {
                            const next = chapters.slice();
                            next[idx].unit_no = Number(v || 1);
                            setChapters(next);
                          }}
                          disabled={!canEdit}
                          addonBefore="Chapter Name"
                        />

                        {/* Status Tag (click to cycle for admins) */}
                        <Tooltip
                          title={
                            ch.id
                              ? (canEdit ? 'Click to change status' : STATUS_LABEL[ch.status] || 'Status')
                              : 'Save draft to enable status updates'
                          }
                        >
                          <span
                            onClick={() => {
                              if (!canEdit || !ch.id) return;
                              updateChapterStatus(idx, nextStatus(ch.status || 'pending'));
                            }}
                            style={{ cursor: canEdit && ch.id ? 'pointer' : 'default', userSelect: 'none' }}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 10px',
                                borderRadius: 12,
                                background: STATUS_COLOR[ch.status || 'pending'],
                                color: ch.status === 'pending' ? '#000' : '#fff',
                                fontSize: 12,
                                fontWeight: 500,
                              }}
                            >
                              {STATUS_LABEL[ch.status || 'pending']}
                            </span>
                          </span>
                        </Tooltip>
                      </Space>

                      <Input
                        placeholder="Name"
                        value={ch.title}
                        onChange={(e) => {
                          const next = chapters.slice();
                          next[idx].title = e.target.value;
                          setChapters(next);
                        }}
                        disabled={!canEdit}
                      />
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </>
        )}
      </Space>
    </Card>
  );
}

export function Syllabus() {
  return <SyllabusTracking />;
}
