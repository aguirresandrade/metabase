import React, { Component } from "react";
import PropTypes from "prop-types";
import { t } from "ttag";
import _ from "underscore";
import {
  SortableContainer,
  SortableElement,
  SortableHandle,
} from "react-sortable-hoc";

import AccordionList from "metabase/components/AccordionList";
import PopoverWithTrigger from "metabase/components/PopoverWithTrigger";
import Icon from "metabase/components/Icon";
import Grabber from "metabase/components/Grabber";

import ColumnItem from "./ColumnItem";

export default class ColumnsList extends Component {
  constructor(props) {
    super(props);
    this.state = { fieldOrder: undefined };
  }

  static propTypes = {
    table: PropTypes.object,
    idfields: PropTypes.array,
    updateField: PropTypes.func.isRequired,
  };

  componentDidMount() {
    this.setState({ fieldOrder: this.getFieldOrder(this.props.table) });
  }

  componentDidUpdate(prevProps) {
    const prevFieldOrder = this.getFieldOrder(prevProps.table);
    const fieldOrder = this.getFieldOrder(this.props.table);
    if (!_.isEqual(fieldOrder, prevFieldOrder)) {
      this.setState({ fieldOrder });
    }
  }

  getFieldOrder(table) {
    const { fields } = table || {};
    if (!fields) {
      return;
    }
    const positionById = {};
    for (const { id, position } of fields) {
      positionById[id] = position;
    }
    return positionById;
  }

  handleSortEnd = async ({ oldIndex, newIndex }) => {
    if (oldIndex === newIndex) {
      return;
    }
    const fieldIdPositionPairs = Object.entries(this.state.fieldOrder);
    const sortedFieldIds = new Array(fieldIdPositionPairs.length);
    const fieldOrder = {};
    for (const [id, index] of fieldIdPositionPairs) {
      const idx =
        index === oldIndex ? newIndex : index === newIndex ? oldIndex : index;
      fieldOrder[id] = idx;
      sortedFieldIds[idx] = parseInt(id);
    }
    this.setState({ fieldOrder });

    if (this.props.table.field_order !== "custom") {
      await this.props.table.update({ field_order: "custom" });
    }
    this.props.table.setFieldOrder(sortedFieldIds);
  };

  render() {
    const { table = {} } = this.props;
    const { fields = [] } = table;
    const { fieldOrder } = this.state;
    return (
      <div id="ColumnsList" className="my3">
        <div className="flex align-baseline justify-between">
          <h2 className="px1 text-orange">{t`Columns`}</h2>
          <ColumnOrderDropdown table={table} />
        </div>
        <div className="text-uppercase text-medium py1">
          <div
            style={{ minWidth: 420 }}
            className="float-left px1"
          >{t`Column`}</div>
          <div className="flex clearfix">
            <div className="flex-half px1">{t`Visibility`}</div>
            <div className="flex-half px1">{t`Type`}</div>
          </div>
        </div>
        <SortableColumns
          onSortEnd={this.handleSortEnd}
          helperClass="sort-helper"
          useDragHandle={true}
        >
          {(fieldOrder == null
            ? fields
            : _.sortBy(fields, ({ id }) => fieldOrder[id])
          ).map((field, index) => (
            <SortableColumnItem
              key={field.id}
              field={field}
              updateField={this.props.updateField}
              idfields={this.props.idfields}
              dragHandle={<DragHandle />}
              index={index}
            />
          ))}
        </SortableColumns>
      </div>
    );
  }
}

function Columns({ children, ...props }) {
  return (
    <div className="border-top border-bottom" {...props}>
      {children}
    </div>
  );
}

const SortableColumns = SortableContainer(Columns);

const SortableColumnItem = SortableElement(ColumnItem);
const DragHandle = SortableHandle(() => <Grabber style={{ width: 10 }} />);

const COLUMN_ORDERS = {
  database: t`Database`,
  alphabetical: t`Alphabetical`,
  custom: t`Custom`,
  smart: t`Smart`,
};

class ColumnOrderDropdown extends Component {
  handleSelect = ({ value }) => {
    this.props.table.update({ field_order: value });
    this._popover.close();
  };

  render() {
    const { table } = this.props;
    const items = Object.entries(COLUMN_ORDERS).map(([value, name]) => ({
      value,
      name,
    }));
    return (
      <PopoverWithTrigger
        ref={ref => (this._popover = ref)}
        triggerElement={
          <span
            className="text-brand"
            style={{ textTransform: "none", letterSpacing: 0 }}
          >
            {t`Column order: ${COLUMN_ORDERS[table.field_order]}`}
            <Icon
              className="ml1"
              name="chevrondown"
              size={12}
              style={{ transform: "translateY(2px)" }}
            />
          </span>
        }
      >
        <AccordionList
          className="text-brand"
          sections={[{ items }]}
          alwaysExpanded
          onChange={this.handleSelect}
          itemIsSelected={({ value }) => value === table.field_order}
        />
      </PopoverWithTrigger>
    );
  }
}
