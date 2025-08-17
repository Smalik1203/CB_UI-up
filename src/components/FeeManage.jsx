// src/components/FeeManage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card, Table, Space, Button, Typography, Select, Drawer, Modal,
  Row, Col, message, Empty, InputNumber, Divider, Spin, Alert
} from "antd";
import { EditOutlined, PlusOutlined, CopyOutlined } from "@ant-design/icons";
import { supabase } from "../config/supabaseClient";
import { Page, EmptyState, EntityDrawer } from "../ui";
import { fmtINR, toPaise } from "../utils/money";

const { Title, Text } = Typography;

export default function FeeManage() {
  // User context
  const [me, setMe] = useState({ id: null, role: "", school_code: null });
  const canWrite = useMemo(() => ["admin", "superadmin"].includes(me.role || ""), [me.role]);

  // Class data (with academic year for fee plans)
  const [activeYear, setActiveYear] = useState(null);
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState(null);

  // Catalog and table data
  const [catalog, setCatalog] = useState([]); // fee_component_types
  const [rows, setRows] = useState([]); // students + totals
  const [boot, setBoot] = useState(true);
  const [loading, setLoading] = useState(false);
  const [rlsHint, setRlsHint] = useState(false);

  // Drawer editor state
  const [drawer, setDrawer] = useState({
    open: false,
    student: null,   // { id, name, code }
    planId: null,
    items: []        // [{ component_type_id, amount_inr }]
  });
  const [saving, setSaving] = useState(false);

  // Copy fee plan state
  const [copyModal, setCopyModal] = useState({
    open: false,
    sourceStudent: null,  // { id, name, code }
    targetStudentId: null,
    loading: false
  });

  // ---------- bootstrap ----------
  useEffect(() => {
    (async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user) throw new Error("Not authenticated");

        console.log("User:", user);

        const { data: urec, error: uErr } = await supabase
          .from("users")
          .select("role, school_code")
          .eq("id", user.id)
          .single();
        
        console.log("User record:", urec, "Error:", uErr);
        
        if (uErr) throw uErr;

        const role = urec?.role || "";
        const school_code = urec?.school_code || null;
        setMe({ id: user.id, role, school_code });

        console.log("Me state:", { id: user.id, role, school_code });

        if (!school_code) {
          message.error("No school code found for user");
          return;
        }

        // Get active academic year (needed for fee plans)
        const { data: ay, error: ayErr } = await supabase
          .from("academic_years")
          .select("id, year_start, year_end")
          .eq("school_code", school_code)
          .eq("is_active", true)
          .single();
        
        console.log("Active year:", ay, "Error:", ayErr);
        
        if (ayErr) {
          console.log("No active academic year found, but continuing...");
          // Don't throw error, just continue without academic year
        } else {
          setActiveYear(ay);
        }

        // 🎯 SIMPLIFIED: Get all class instances for the school (no academic year filter)
        const { data: cls, error: cErr } = await supabase
          .from("class_instances")
          .select("id, grade, section")
          .eq("school_code", school_code)
          .order("grade")
          .order("section");
        
        console.log("Classes:", cls, "Error:", cErr);
        
        if (cErr) throw cErr;
        
        const classOptions = (cls || []).map(c => ({
          value: c.id,
          label: `Grade ${c.grade ?? "-"} - ${c.section ?? "-"}`
        }));
        setClasses(classOptions);

        // Auto-select first class
        if (classOptions.length > 0) {
          setClassId(classOptions[0].value);
        }

        // Get component catalog
        const { data: comp, error: compErr } = await supabase
          .from("fee_component_types")
          .select("id, name, default_amount_paise")
          .eq("school_code", school_code)
          .order("name");
        
        console.log("Components:", comp, "Error:", compErr);
        
        if (compErr) throw compErr;
        setCatalog(comp || []);
      } catch (e) {
        console.error("Bootstrap error:", e);
        message.error(e.message || "Failed to init");
      } finally {
        setBoot(false);
      }
    })();
  }, []);

  // ---------- load table for selected class ----------
  const loadStudentsAndTotals = useCallback(async (cid) => {
    if (!cid || !me.school_code) return;
    setLoading(true);
    setRlsHint(false);
    
    try {
      console.log("Loading students for class:", cid, "school:", me.school_code);
      
      // 🎯 SIMPLIFIED: Direct student query - no academic year dependency
      const { data: students, error: sErr } = await supabase
        .from("student")
        .select("id, full_name, student_code, class_instance_id")
        .eq("class_instance_id", cid)
        .eq("school_code", me.school_code)
        .order("full_name");
      
      console.log("Students query result:", students, "Error:", sErr);
      
      if (sErr) throw sErr;
      const studentList = students || [];

      // Check for RLS hint (admin role, empty results, no error)
      if (me.role === "admin" && studentList.length === 0 && !sErr) {
        setRlsHint(true);
      }

      // 🎯 SIMPLIFIED: Get plans for this class (no academic year filter)
      const { data: plans, error: pErr } = await supabase
        .from("fee_student_plans")
        .select("id, student_id")
        .eq("class_instance_id", cid)
        .eq("school_code", me.school_code);
      
      console.log("Plans query result:", plans, "Error:", pErr);
      
      if (pErr) throw pErr;

      const planByStudent = new Map((plans || []).map(p => [p.student_id, p.id]));
      const planIds = plans?.map(p => p.id) || [];

      // 3) items for those plans — aggregate totals
      const totalByPlan = new Map();
      if (planIds.length > 0) {
        const { data: items, error: iErr } = await supabase
          .from("fee_student_plan_items")
          .select("plan_id, amount_paise")
          .in("plan_id", planIds);
        
        console.log("Items query result:", items, "Error:", iErr);
        
        if (iErr) throw iErr;
        for (const it of items || []) {
          totalByPlan.set(it.plan_id, (totalByPlan.get(it.plan_id) || 0) + Number(it.amount_paise || 0));
        }
      }

      setRows(studentList.map(st => {
        const pid = planByStudent.get(st.id) || null;
        const total = pid ? (totalByPlan.get(pid) || 0) : 0;
        return {
          key: st.id,
          student_id: st.id,
          student_name: st.full_name,
          student_code: st.student_code,
          plan_id: pid,
          total_paise: total
        };
      }));
      
      console.log("Final rows set:", studentList.length, "students");
    } catch (e) {
      console.error("Error loading students:", e);
      message.error(e.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [me.school_code, me.role]);

  // Load students when class changes
  useEffect(() => {
    if (classId) {
      loadStudentsAndTotals(classId);
    }
  }, [classId, loadStudentsAndTotals]);

  // ---------- copy fee plan from one student to another ----------
  const copyFeePlan = async () => {
    if (!copyModal.sourceStudent || !copyModal.targetStudentId) return;
    
    setCopyModal(prev => ({ ...prev, loading: true }));
    
    try {
      // 1. Get source student's fee plan
      const { data: sourcePlan, error: planError } = await supabase
        .from("fee_student_plans")
        .select("id")
        .eq("student_id", copyModal.sourceStudent.id)
        .eq("class_instance_id", classId)
        .eq("school_code", me.school_code)
        .single();
      
      if (planError || !sourcePlan) {
        message.error("Source student has no fee plan to copy");
        return;
      }

      // 2. Get source plan items
      const { data: sourceItems, error: itemsError } = await supabase
        .from("fee_student_plan_items")
        .select("component_type_id, amount_paise")
        .eq("plan_id", sourcePlan.id);
      
      if (itemsError) throw itemsError;
      
      if (!sourceItems || sourceItems.length === 0) {
        message.error("Source student has no fee components to copy");
        return;
      }

      // 3. Check if target student already has a plan
      const { data: existingPlan, error: existingError } = await supabase
        .from("fee_student_plans")
        .select("id")
        .eq("student_id", copyModal.targetStudentId)
        .eq("class_instance_id", classId)
        .eq("school_code", me.school_code)
        .single();

      let targetPlanId;

      if (existingPlan) {
        // Update existing plan
        targetPlanId = existingPlan.id;
        
        // Delete existing items
        const { error: deleteError } = await supabase
          .from("fee_student_plan_items")
          .delete()
          .eq("plan_id", targetPlanId);
        
        if (deleteError) throw deleteError;
      } else {
        // Create new plan
        if (!activeYear) {
          message.error("No active academic year found. Please set up an active academic year first.");
          return;
        }

        const { data: newPlan, error: createError } = await supabase
          .from("fee_student_plans")
          .insert({
            school_code: me.school_code,
            student_id: copyModal.targetStudentId,
            class_instance_id: classId,
            academic_year_id: activeYear.id,
            created_by: me.id
          })
          .select("id")
          .single();
        
        if (createError) throw createError;
        targetPlanId = newPlan.id;
      }

      // 4. Copy fee items to target plan
      const itemsToInsert = sourceItems.map(item => ({
        plan_id: targetPlanId,
        component_type_id: item.component_type_id,
        amount_paise: item.amount_paise
      }));

      const { error: insertError } = await supabase
        .from("fee_student_plan_items")
        .insert(itemsToInsert);
      
      if (insertError) throw insertError;

      message.success("Fee plan copied successfully");
      setCopyModal({ open: false, sourceStudent: null, targetStudentId: null, loading: false });
      
      // Reload data
      loadStudentsAndTotals(classId);
    } catch (e) {
      console.error("Error copying fee plan:", e);
      message.error(e.message || "Failed to copy fee plan");
    } finally {
      setCopyModal(prev => ({ ...prev, loading: false }));
    }
  };

  // ---------- open drawer for a student ----------
  const openEditor = async (row) => {
    try {
      let planId = row.plan_id;

      // create plan if missing
      if (!planId) {
        // Check if we have active year for fee plans
        if (!activeYear) {
          message.error("No active academic year found. Please set up an active academic year first.");
          return;
        }

        const { data: ins, error: iErr } = await supabase
          .from("fee_student_plans")
          .insert({
            school_code: me.school_code,
            student_id: row.student_id,
            class_instance_id: classId,
            academic_year_id: activeYear.id,  // Required by schema
            created_by: me.id
          })
          .select("id")
          .single();
        
        if (iErr) throw iErr;
        planId = ins.id;
      }

      // load existing items
      const { data: items, error: itemsErr } = await supabase
        .from("fee_student_plan_items")
        .select("component_type_id, amount_paise")
        .eq("plan_id", planId);
      
      if (itemsErr) throw itemsErr;

      setDrawer({
        open: true,
        student: { id: row.student_id, name: row.student_name, code: row.student_code },
        planId,
        items: (items || []).map(it => ({
          component_type_id: it.component_type_id,
          amount_inr: it.amount_paise / 100
        }))
      });
    } catch (e) {
      console.error("Error opening editor:", e);
      message.error(e.message || "Failed to open editor");
    }
  };

  // ---------- save plan ----------
  const savePlan = async () => {
    if (!drawer.planId) return;
    setSaving(true);
    
    try {
      // get existing items to compare
      const { data: existing, error: existingErr } = await supabase
        .from("fee_student_plan_items")
        .select("component_type_id")
        .eq("plan_id", drawer.planId);
      
      if (existingErr) throw existingErr;

      const existingIds = new Set((existing || []).map(e => e.component_type_id));
      const newIds = new Set(drawer.items.map(i => i.component_type_id));

      // delete removed items
      const toDelete = Array.from(existingIds).filter(id => !newIds.has(id));
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from("fee_student_plan_items")
          .delete()
          .eq("plan_id", drawer.planId)
          .in("component_type_id", toDelete);
        
        if (delErr) throw delErr;
      }

      // upsert new/updated items
      const toUpsert = drawer.items.map(item => ({
        plan_id: drawer.planId,
        component_type_id: item.component_type_id,
        amount_paise: toPaise(item.amount_inr)
      }));

      if (toUpsert.length > 0) {
        const { error: upsertErr } = await supabase
          .from("fee_student_plan_items")
          .upsert(toUpsert, { onConflict: "plan_id,component_type_id" });
        
        if (upsertErr) throw upsertErr;
      }

      message.success("Plan saved successfully");
      setDrawer({ open: false, student: null, planId: null, items: [] });
      
      // reload data
      loadStudentsAndTotals(classId);
    } catch (e) {
      console.error("Error saving plan:", e);
      message.error(e.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  // ---------- drawer helpers ----------
  const addItem = () => {
    setDrawer(prev => ({
      ...prev,
      items: [...prev.items, { component_type_id: null, amount_inr: 0 }]
    }));
  };

  const removeItem = (index) => {
    setDrawer(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setDrawer(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // auto-set amount if component has default
      if (field === 'component_type_id' && value) {
        const component = catalog.find(c => c.id === value);
        if (component?.default_amount_paise) {
          newItems[index].amount_inr = component.default_amount_paise / 100;
        }
      }
      
      return { ...prev, items: newItems };
    });
  };

  // ---------- table columns ----------
  const columns = [
    {
      title: "Student",
      key: "student",
      render: (_, record) => (
        <div>
          <div><strong>{record.student_name}</strong></div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.student_code}</div>
        </div>
      )
    },
    {
      title: "Total Fee",
      key: "total",
      align: "right",
      render: (_, record) => (
        <Text strong>{fmtINR(record.total_paise)}</Text>
      )
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => openEditor(record)}
            disabled={!canWrite}
          >
            Edit Plan
          </Button>
          {record.plan_id && (
            <Button
              type="default"
              icon={<CopyOutlined />}
              onClick={() => setCopyModal({
                open: true,
                sourceStudent: { 
                  id: record.student_id, 
                  name: record.student_name, 
                  code: record.student_code 
                },
                targetStudentId: null,
                loading: false
              })}
              disabled={!canWrite}
            >
              Copy
            </Button>
          )}
        </Space>
      )
    }
  ];

  if (boot) {
    return (
      <Page title="Fee Management" loading={true}>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '20px' }}>Loading...</div>
        </div>
      </Page>
    );
  }

  return (
    <Page 
      title="Fee Management"
      extra={
        <Select
          placeholder="Select Class"
          value={classId}
          onChange={setClassId}
          style={{ width: 300 }}
          options={classes}
        />
      }
    >
      {rlsHint && (
        <Alert
          message="No students found"
          description="You may not have permission to view students in this class. Please contact your administrator."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        <Table
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={false}
          locale={{
            emptyText: (
              <EmptyState
                title="No students found"
                description={
                  classId 
                    ? "No students are assigned to this class."
                    : "Please select a class to view students."
                }
              />
            )
          }}
        />
      </Card>

      {/* Drawer Editor */}
      <Drawer
        title={`Edit Fee Plan - ${drawer.student?.name}`}
        open={drawer.open}
        onClose={() => setDrawer({ open: false, student: null, planId: null, items: [] })}
        width={600}
        footer={
          <Space>
            <Button onClick={() => setDrawer({ open: false, student: null, planId: null, items: [] })}>
              Cancel
            </Button>
            <Button type="primary" onClick={savePlan} loading={saving}>
              Save Plan
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Button type="dashed" onClick={addItem} block icon={<PlusOutlined />}>
            Add Component
          </Button>
        </div>

        {drawer.items.map((item, index) => (
          <Card key={index} size="small" style={{ marginBottom: 8 }}>
            <Row gutter={8} align="middle">
              <Col span={12}>
                <Select
                  placeholder="Select component"
                  value={item.component_type_id}
                  onChange={(value) => updateItem(index, 'component_type_id', value)}
                  style={{ width: '100%' }}
                  options={catalog.map(c => ({ value: c.id, label: c.name }))}
                />
              </Col>
              <Col span={8}>
                <InputNumber
                  placeholder="Amount"
                  value={item.amount_inr}
                  onChange={(value) => updateItem(index, 'amount_inr', value)}
                  formatter={(value) => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value.replace(/₹\s?|(,*)/g, '')}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={4}>
                <Button 
                  type="text" 
                  danger 
                  onClick={() => removeItem(index)}
                  disabled={drawer.items.length === 1}
                >
                  Remove
                </Button>
              </Col>
            </Row>
          </Card>
        ))}

        {drawer.items.length === 0 && (
          <Empty description="No components added" />
        )}
      </Drawer>

      {/* Copy Fee Plan Modal */}
      <Modal
        title="Copy Fee Plan"
        open={copyModal.open}
        onCancel={() => setCopyModal({ open: false, sourceStudent: null, targetStudentId: null, loading: false })}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => setCopyModal({ open: false, sourceStudent: null, targetStudentId: null, loading: false })}
          >
            Cancel
          </Button>,
          <Button 
            key="copy" 
            type="primary" 
            onClick={copyFeePlan}
            loading={copyModal.loading}
            disabled={!copyModal.targetStudentId}
          >
            Copy Plan
          </Button>
        ]}
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>Copy fee plan from:</Text>
          <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
            <div><strong>{copyModal.sourceStudent?.name}</strong></div>
            <div style={{ fontSize: '12px', color: '#666' }}>{copyModal.sourceStudent?.code}</div>
          </div>
        </div>
        
        <div>
          <Text strong>To student:</Text>
          <div style={{ marginTop: 8 }}>
            <Select
              placeholder="Select target student"
              value={copyModal.targetStudentId}
              onChange={(value) => setCopyModal(prev => ({ ...prev, targetStudentId: value }))}
              style={{ width: '100%' }}
              options={rows
                .filter(row => row.student_id !== copyModal.sourceStudent?.id) // Exclude source student
                .map(row => ({
                  value: row.student_id,
                  label: (
                    <div>
                      <div><strong>{row.student_name}</strong></div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{row.student_code}</div>
                    </div>
                  )
                }))
              }
            />
          </div>
        </div>
        
        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#fff7e6', borderRadius: 6, border: '1px solid #ffd591' }}>
          <Text type="warning">
            ⚠️ This will replace any existing fee plan for the target student.
          </Text>
        </div>
      </Modal>
    </Page>
  );
}

