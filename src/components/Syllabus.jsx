import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Divider, Input, InputNumber, List, Select,
  Space, Typography, Popconfirm, Tooltip, message, Skeleton
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { supabase } from '../config/supabaseClient';

const { Title, Text } = Typography;

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

function byText(field) {
  return (a, b) => String(a[field]).localeCompare(String(b[field]));
}

export default function SyllabusPage() {
  const [msg, ctx] = message.useMessage();

  // Query params (optional deep-linking)
  const params = new URLSearchParams(window.location.search);
  const qpSubjectId = params.get('subjectId');
  const qpClassInstanceId = params.get('classInstanceId');

  // State
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [subjects, setSubjects] = useState([]);
  const [classInstances, setClassInstances] = useState([]);

  const [subjectId, setSubjectId] = useState(qpSubjectId);
  const [classInstanceId, setClassInstanceId] = useState(qpClassInstanceId);

  const [syllabus, setSyllabus] = useState(null); // {id,...} or null
  const [chapters, setChapters] = useState([]);   // [{id, unit_no, title, status}]

  const canEdit = me?.role === 'admin' || me?.role === 'superadmin';

  // ---------- Bootstrap ----------
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) throw new Error('Not signed in');

        // Authoritative role/school from public.users
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

  // ---------- Load syllabus + chapters when filters change ----------
  useEffect(() => {
    if (!subjectId || !classInstanceId) {
      setSyllabus(null);
      setChapters([]);
      return;
    }
    (async () => {
      try {
        setBusy(true);
        setError(null);

        const { data: syl, error: sylErr } = await supabase
          .from('syllabi')
          .select('id, subject_id, class_instance_id')
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
          .select('id, unit_no, title, status')
          .eq('syllabus_id', syl.id)
          .order('unit_no', { ascending: true })
          .order('title', { ascending: true });
        if (itErr) throw itErr;

        setChapters(its ?? []);
      } catch (e) {
        setError(e?.message || 'Failed to load syllabus');
        setChapters([]);
      } finally {
        setBusy(false);
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

  // ---------- Actions (no draft; all write immediately) ----------

  const ensureSyllabus = async () => {
    if (!canEdit) return;
    if (!me?.school_code || !subjectId || !classInstanceId) {
      msg.error('Select Class & Subject first'); return;
    }
    try {
      setBusy(true);
      const { data, error } = await supabase
        .from('syllabi')
        .insert({
          school_code: me.school_code,
          subject_id: subjectId,
          class_instance_id: classInstanceId,
          created_by: me.id,
        })
        .select('id, subject_id, class_instance_id')
        .single();
      if (error) {
        if (error.code === '23505') {
          // already exists; refetch
          const { data: exists } = await supabase
            .from('syllabi')
            .select('id, subject_id, class_instance_id')
            .eq('subject_id', subjectId)
            .eq('class_instance_id', classInstanceId)
            .single();
          setSyllabus(exists);
          msg.info('Syllabus already existed. Loaded it.');
        } else {
          throw error;
        }
      } else {
        setSyllabus(data);
        msg.success('Syllabus created');
      }
    } catch (e) {
      msg.error(e?.message || 'Failed to create syllabus');
    } finally {
      setBusy(false);
    }
  };

  const addChapter = async () => {
    if (!canEdit) return;
    if (!syllabus?.id) { msg.error('Create syllabus first'); return; }
    try {
      setBusy(true);
      const nextUnit = (chapters.reduce((m, it) => Math.max(m, it.unit_no), 0) || 0) + 1;
      const { data, error } = await supabase
        .from('syllabus_items')
        .insert({
          syllabus_id: syllabus.id,
          unit_no: nextUnit,
          title: '',
          status: 'pending',
          created_by: me.id,
        })
        .select('id, unit_no, title, status')
        .single();
      if (error) throw error;
      setChapters((prev) => [...prev, data].sort((a, b) => a.unit_no - b.unit_no || a.title.localeCompare(b.title)));
      msg.success('Chapter added');
    } catch (e) {
      const code = e?.code || e?.details;
      if (code === '23505') msg.error('Duplicate chapter number'); else msg.error(e?.message || 'Add failed');
    } finally {
      setBusy(false);
    }
  };

  const updateChapter = async (id, patch) => {
    if (!canEdit || !id) return;
    // optimistic update
    setChapters((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, ...patch } : ch))
        .sort((a, b) => a.unit_no - b.unit_no || a.title.localeCompare(b.title))
    );
    try {
      const { error } = await supabase
        .from('syllabus_items')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
      // success toast only for status changes (to reduce noise)
      if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
        msg.success('Status updated');
      }
    } catch (e) {
      msg.error(e?.message || 'Update failed');
      // hard reload this chapter from DB (best effort)
      try {
        const { data } = await supabase
          .from('syllabus_items')
          .select('id, unit_no, title, status')
          .eq('id', id)
          .single();
        if (data) {
          setChapters((prev) =>
            prev.map((ch) => (ch.id === id ? data : ch))
              .sort((a, b) => a.unit_no - b.unit_no || a.title.localeCompare(b.title))
          );
        }
      } catch {}
    }
  };

  const removeChapter = async (id) => {
    if (!canEdit || !id) return;
    // optimistic
    const before = chapters;
    setChapters((prev) => prev.filter((c) => c.id !== id));
    try {
      const { error } = await supabase.from('syllabus_items').delete().eq('id', id);
      if (error) throw error;
      msg.success('Deleted');
    } catch (e) {
      setChapters(before);
      msg.error(e?.message || 'Delete failed');
    }
  };

  // ---------- Render ----------

  return (
    <Card title={<Title level={4} style={{ margin: 0 }}>Syllabus</Title>}>
      {ctx}
      {error && <Alert type="error" message="Error" description={error} style={{ marginBottom: 16 }} showIcon />}

      {/* Filters */}
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space wrap>
          <div style={{ minWidth: 260 }}>
            <Text strong>Subject</Text>
            <Select
              showSearch
              placeholder="Select subject"
              style={{ width: 320 }}
              value={subjectId || undefined}
              onChange={(v) => setSubjectId(v)}
              options={subjectOptions}
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
              style={{ width: 320 }}
              value={classInstanceId || undefined}
              onChange={(v) => setClassInstanceId(v)}
              options={classInstanceOptions}
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>

          {!syllabus ? (
            <Tooltip title={!canEdit ? 'You do not have edit permissions' : 'Create syllabus for this Class × Subject'}>
              <span>
                <Button
                  type="primary"
                  onClick={ensureSyllabus}
                  disabled={!canEdit || !subjectId || !classInstanceId || busy}
                  icon={<PlusOutlined />}
                >
                  Create Syllabus
                </Button>
              </span>
            </Tooltip>
          ) : null}
        </Space>

        {/* Chapters */}
        {busy && !syllabus ? <Skeleton active paragraph={{ rows: 4 }} /> : null}

        {syllabus && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
              <Title level={5} style={{ margin: 0 }}>Chapters</Title>
              <Button onClick={addChapter} disabled={!canEdit || busy} icon={<PlusOutlined />}>Add Chapter</Button>
            </Space>

            {busy && chapters.length === 0 ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : chapters.length === 0 ? (
              <Alert type="info" message="No chapters yet. Click 'Add Chapter' to start." />
            ) : (
              <List
                dataSource={chapters}
                rowKey="id"
                renderItem={(ch) => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        key="del"
                        title="Remove this chapter?"
                        onConfirm={() => removeChapter(ch.id)}
                        okButtonProps={{ danger: true }}
                        disabled={!canEdit}
                      >
                        <Button danger size="small" icon={<DeleteOutlined />} disabled={!canEdit} />
                      </Popconfirm>,
                    ]}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space wrap>
                        {/* Chapter number */}
                        <InputNumber
                          min={1}
                          value={ch.unit_no}
                          onChange={(v) => updateChapter(ch.id, { unit_no: Number(v || 1) })}
                          disabled={!canEdit}
                          addonBefore="Chapter #"
                        />

                        {/* Status */}
                        <Select
                          value={ch.status || 'pending'}
                          onChange={(v) => updateChapter(ch.id, { status: v })}
                          options={STATUS_OPTIONS}
                          style={{ width: 180 }}
                          disabled={!canEdit}
                        />
                      </Space>

                      {/* Chapter name */}
                      <Input
                        placeholder="Chapter Name"
                        value={ch.title}
                        onChange={(e) => updateChapter(ch.id, { title: e.target.value })}
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
